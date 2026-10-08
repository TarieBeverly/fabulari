const { Server } = require('socket.io');
const { randomUUID } = require('node:crypto');
const S = require('./storage');
const D = require('./domain');
const Media = require('./media');
function attachChat(server, sessionMiddleware) {
  const io = new Server(server, { cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200', credentials: true }, maxHttpBufferSize: 3 * 1024 * 1024 });
  io.engine.use(sessionMiddleware);
  const active = new Map(), localHistory = new Map();
  const roomKey = id => 'channel:' + id;
  async function history(id, messages) {
    if (S.jsonMode) { if (messages) localHistory.set(id, messages.slice(-5)); return localHistory.get(id) || []; }
    const { db } = await S.mongo();
    if (messages) await db.collection('roomHistory').updateOne({ _id: id }, { $set: { messages: messages.slice(-5) } }, { upsert: true });
    return (await db.collection('roomHistory').findOne({ _id: id }))?.messages || [];
  }
  function eligible(db, user, id) {
    if (!user || D.isSuper(user)) D.fail('Community member access is required.', 403);
    const channel = db.channels.find(c => c.id === id); if (!channel) D.fail('Room no longer exists.', 404);
    const group = D.groupById(db, channel.groupId);
    if (!D.isMember(user, group)) D.fail('You no longer belong to this group.', 403);
    D.eligible(user, group, channel); return channel;
  }
  function participants(id) {
    return [...active.values()].filter(s => s.data.roomId === id).map(s => ({ id: s.data.user.id, username: s.data.user.username, avatar: s.data.user.avatar || '' }));
  }
  function presence(id) { io.to(roomKey(id)).emit('room:participants', participants(id)); }
  async function leave(socket, message) {
    const id = socket.data.roomId; if (!id) return;
    socket.data.roomId = undefined; socket.data.owned = new Set();
    if (active.get(socket.data.user.id) === socket) active.delete(socket.data.user.id);
    await socket.leave(roomKey(id)); presence(id);
    io.to(roomKey(id)).emit('room:notice', socket.data.user.username + ' left the room.');
    if (message) socket.emit('room:closed', { message });
    if (!participants(id).length) await Media.cleanRoom(id, await history(id));
  }
  async function userFor(socket) {
    await new Promise((resolve, reject) => socket.request.session.reload(error => error ? reject(Object.assign(new Error('Please sign in again.'), { status: 401 })) : resolve()));
    const db = await S.readDatabase(), user = db.users.find(u => u.id === socket.request.session.userId);
    if (!user) D.fail('Please sign in again.', 401);
    socket.data.user = D.safeUser(user); return { db, user };
  }
  io.use(async (socket, next) => {
    try {
      if (socket.handshake.headers.origin && socket.handshake.headers.origin !== (process.env.FRONTEND_ORIGIN || 'http://localhost:4200')) D.fail('Untrusted browser origin.', 403);
      const db = await S.readDatabase(), user = db.users.find(u => u.id === socket.request.session?.userId);
      if (!user || D.isSuper(user)) D.fail('Sign in with a community account.', 401);
      socket.data.user = D.safeUser(user); socket.data.owned = new Set(); next();
    } catch (error) { next(new Error(error.status ? error.message : 'Chat is temporarily unavailable.')); }
  });
  io.on('connection', socket => {
    function event(name, action) {
      socket.on(name, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        S.withLock(async () => {
          try { const context = await userFor(socket); reply({ ok: true, ...await action(payload || {}, context) }); }
          catch (error) { reply({ ok: false, message: error.status ? error.message : 'Chat action failed. Please try again.' }); if (error.status === 401) await leave(socket, 'Your session ended. Sign in again.'); }
        }).catch(error => console.error(error));
      });
    }
    event('room:join', async (payload, { db, user }) => {
      const channel = eligible(db, user, payload.channelId);
      if (socket.data.roomId === channel.id) return { messages: await history(channel.id), participants: participants(channel.id) };
      await leave(socket);
      const previous = active.get(user.id); if (previous && previous !== socket) await leave(previous, 'You opened another room or browser tab.');
      const messages = await history(channel.id);
      if (!participants(channel.id).length) await Media.cleanRoom(channel.id, messages);
      socket.data.roomId = channel.id; socket.data.owned = new Set(messages.filter(m => m.authorId === user.id).map(m => m.id));
      active.set(user.id, socket); await socket.join(roomKey(channel.id)); presence(channel.id);
      socket.to(roomKey(channel.id)).emit('room:notice', user.username + ' joined the room.');
      return { messages, participants: participants(channel.id) };
    });
    event('room:leave', async () => { await leave(socket); return {}; });
    event('message:send', async (payload, { db, user }) => {
      const id = socket.data.roomId; eligible(db, user, id);
      let text = typeof payload.text === 'string' ? payload.text.trim() : '';

      if (!text && !payload.image) D.fail('Enter a message or choose an image.');
      const messageId = randomUUID();
      const image = payload.image ? await Media.create(payload.image, user.id, id, messageId) : undefined;
      const message = { id: messageId, authorId: user.id, author: user.username, authorAvatar: user.avatar || '', text, time: new Date().toISOString(), ...(image ? { image } : {}) };
      const messages = await history(id); await history(id, [...messages, message]);
      socket.data.owned.add(message.id); io.to(roomKey(id)).emit('message:new', message); return { message };
    });
    event('message:delete', async (payload, { db, user }) => {
      const id = socket.data.roomId; eligible(db, user, id);
      if (!socket.data.owned.has(payload.id)) D.fail('You can delete only your own messages in this room session.', 403);
      await history(id, (await history(id)).filter(m => m.id !== payload.id)); await Media.deleteMessage(payload.id); socket.data.owned.delete(payload.id);
      io.to(roomKey(id)).emit('message:deleted', { id: payload.id }); return {};
    });
    socket.on('disconnect', () => { S.withLock(() => leave(socket)).catch(console.error); });
  });
  const changed = snapshot => {
    S.withLock(async () => {
      await Media.cleanDeleted(snapshot);
      if (!S.jsonMode) {
        const { db } = await S.mongo();
        await db.collection('roomHistory').deleteMany({ _id: { $nin: snapshot.channels.map(c => c.id) } });
        await db.collection('roomHistory').updateMany({}, { $pull: { messages: { authorId: { $nin: snapshot.users.map(u => u.id) } } } });
      } else {
        for (const [id, messages] of localHistory) {
          if (!snapshot.channels.some(c => c.id === id)) localHistory.delete(id);
          else localHistory.set(id, messages.filter(m => snapshot.users.some(u => u.id === m.authorId)));
        }
      }
      for (const socket of io.sockets.sockets.values()) {
        const user = snapshot.users.find(u => u.id === socket.data.user.id);
        if (!user) { await leave(socket, 'Your account was deleted.'); socket.disconnect(true); continue; }
        socket.data.user = D.safeUser(user);
        socket.emit('messages:authors', { ids: snapshot.users.map(u => u.id) });
        if (socket.data.roomId) {
          try { eligible(snapshot, user, socket.data.roomId); presence(socket.data.roomId); }
          catch (error) { await leave(socket, error.message); }
        }
        socket.emit('workspace:updated');
      }
    }).catch(console.error);
  };
  const sessionEnded = id => { S.withLock(async () => { for (const socket of io.sockets.sockets.values()) if (socket.request.sessionID === id) { await leave(socket, 'You signed out.'); socket.disconnect(true); } }).catch(console.error); };
  S.events.on('sessionEnded', sessionEnded);
  S.events.on('changed', changed);
  server.once('close', () => { S.events.off('changed', changed); S.events.off('sessionEnded', sessionEnded); });
  return io;
}
module.exports = { attachChat };
