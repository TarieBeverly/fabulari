const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { io: client } = require('socket.io-client');
// Explicit opt-in: ordinary npm test does not need a running MongoDB service.
test('MongoDB and authenticated real-time chat', async t => {
  delete process.env.FABULARI_DB; delete process.env.STORAGE_MODE;
  process.env.MONGODB_DATABASE = 'fabulari_test_' + randomUUID().replaceAll('-', '');
  const tlsMode = process.env.FABULARI_TEST_HTTPS === 'true';
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const files = fs.mkdtempSync(path.join(os.tmpdir(), 'fabulari-chat-'));
  process.env.FABULARI_UPLOADS = path.join(files, 'uploads');
  let ca;
  if (tlsMode) {
    const certificate = require('../../scripts/local-certificate').createCertificate(path.join(files, 'certificates'));
    process.env.TLS_KEY_PATH = certificate.key; process.env.TLS_CERT_PATH = certificate.cert;
    process.env.SERVE_CLIENT = 'true'; ca = fs.readFileSync(certificate.cert);
  } else { delete process.env.TLS_KEY_PATH; delete process.env.TLS_CERT_PATH; delete process.env.SERVE_CLIENT; }
  const S = require('../../storage');
  const app = require('../../index');
  const server = app.createServer();
  const io = require('../../chat').attachChat(server, app.sessionMiddleware);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `${tlsMode ? 'https' : 'http'}://127.0.0.1:${server.address().port}`;
  async function request(url, options = {}) {
    if (!tlsMode) return fetch(url, options);
    return new Promise((resolve, reject) => {
      const req = require('node:https').request(url, { ...options, ca, rejectUnauthorized: true, agent: false }, res => {
        const protocol = res.socket.getProtocol(); const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => { const data = Buffer.concat(chunks); resolve({ status: res.statusCode,
          headers: { get: name => Array.isArray(res.headers[name.toLowerCase()]) ? res.headers[name.toLowerCase()][0] : res.headers[name.toLowerCase()] },
          json: async () => JSON.parse(data.toString()), arrayBuffer: async () => data,
          text: async () => data.toString(), protocol }); });
      });
      req.on('error', reject); req.end(options.body);
    });
  }
  const cookies = {}, sockets = [];
  async function call(method, route, body, actor, status = 200) {
    const response = await request(base + '/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(cookies[actor] ? { Cookie: cookies[actor] } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (tlsMode && route === '/auth/login' && status === 200) assert.match(response.headers.get('set-cookie'), /; Secure/);
    if (actor && response.headers.get('set-cookie')) cookies[actor] = response.headers.get('set-cookie').split(';')[0];
    const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data;
  }
  const account = username => ({ username, password: 'Testing123!', firstName: username, lastName: 'Test', email: username + '@example.test', dateOfBirth: '2000-01-01' });
  async function connect(actor) {
    const socket = client(base, { extraHeaders: { Cookie: cookies[actor] }, reconnection: false, ...(tlsMode ? { ca, rejectUnauthorized: true, transports: ['websocket'] } : {}) }); sockets.push(socket);
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); }); return socket;
  }
  const ack = (socket, event, payload) => new Promise((resolve, reject) => socket.timeout(5000).emit(event, payload, (error, response) => error ? reject(error) : resolve(response)));
  const receive = (socket, event) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Missing ' + event)), 5000); socket.once(event, value => { clearTimeout(timer); resolve(value); }); });
  try {
    if (tlsMode) {
      await t.test('HTTPS rejects an untrusted certificate and negotiates TLS 1.2 or later', async () => {
        await assert.rejects(new Promise((resolve, reject) => {
          require('node:https').get(base + '/api/health', resolve).on('error', reject);
        }), /self-signed certificate/);
        const response = await request(base + '/api/health');
        assert.equal(response.status, 200); assert.match(response.protocol, /^TLSv1\.[23]$/);
      });
      await t.test('HTTPS serves the built Angular application and its assets', async () => {
        const response = await request(base + '/login'); assert.equal(response.status, 200);
        const html = await response.text(); assert.match(html, /<app-root>/);
        const assets = [...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)]; assert(assets.length > 0);
        for (const asset of assets) assert.equal((await request(new URL(asset[1], base + '/').href)).status, 200);
      });
    }
    await call('POST', '/auth/bootstrap', account('root'), undefined, 201);
    await call('POST', '/auth/register', account('owner'), undefined, 201);
    await call('POST', '/auth/register', account('member'), undefined, 201);
    for (const actor of ['root', 'owner', 'member']) await call('POST', '/auth/login', { username: actor, password: 'Testing123!' }, actor);
    const r = (await call('POST', '/requests', { type: 'groupCreation', name: 'Chat test', description: '', ageLimit: 0, themeColour: '#4da6ff' }, 'owner')).request;
    await call('POST', `/requests/${r.id}/approve`, {}, 'root');
    const groupId = (await call('GET', '/state', undefined, 'owner')).groups[0].id;
    const join = (await call('POST', '/requests', { type: 'groupJoin', groupId }, 'member')).request;
    await call('POST', `/requests/${join.id}/approve`, {}, 'owner');
    const roomId = (await call('POST', `/groups/${groupId}/channels`, { name: 'General', description: '', ageLimit: 0, themeColour: '#4da6ff' }, 'owner')).channel.id;
    const owner = await connect('owner'), member = await connect('member');
    if (tlsMode) assert.equal(owner.io.engine.transport.name, 'websocket');
    await t.test('MongoDB stores profiles, requests, groups and audit logs', async () => {
      const { db } = await S.mongo(); assert.equal(await db.collection('users').countDocuments(), 3); assert.equal(await db.collection('channels').countDocuments(), 1); assert(await db.collection('logs').countDocuments() > 0);
    });
    await t.test('only active room users appear in presence', async () => {
      assert.equal((await ack(owner, 'room:join', { channelId: roomId })).participants.length, 1);
      assert.equal((await ack(member, 'room:join', { channelId: roomId })).participants.length, 2);
    });
    await t.test('changing an avatar preserves pictures on earlier messages', async () => {
      const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      await call('POST', '/profile/avatar', { data: gif }, 'owner');
      const message = (await ack(owner, 'message:send', { text: 'Avatar regression' })).message;
      assert(message.authorAvatar.startsWith('/api/media/'));
      await call('POST', '/profile/avatar', { data: gif }, 'owner');
      const response = await request(base + message.authorAvatar, { headers: { Cookie: cookies.member } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'image/gif');
    });
    let first;
    await t.test('text is shared and an older active-session message can be deleted', async () => {
      const received = receive(member, 'message:new'); first = (await ack(owner, 'message:send', { text: '<script>plain text</script>' })).message;
      assert.equal((await received).text, first.text);
      for (let i = 0; i < 6; i++) assert((await ack(owner, 'message:send', { text: 'message ' + i })).ok);
      const removed = receive(member, 'message:deleted'); assert((await ack(owner, 'message:delete', { id: first.id })).ok); assert.equal((await removed).id, first.id);
      assert.equal((await ack(member, 'message:delete', { id: first.id })).ok, false);
    });
    await t.test('image type and size validation is enforced by the server', async () => {
      assert.equal((await ack(owner, 'message:send', { image: 'data:image/png;base64,bm90YW5pbWFnZQ==' })).ok, false);
      const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const received = receive(member, 'message:new'); assert((await ack(owner, 'message:send', { image: gif })).ok); const image = (await received).image; assert(image.startsWith('/api/media/'));
      const forbidden = await request(base + image); assert.equal(forbidden.status, 401);
      const response = await request(base + image, { headers: { Cookie: cookies.member } }); assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/gif');
      assert.equal(Buffer.from(await response.arrayBuffer()).toString('base64'), gif.split(',')[1]);
    });
    await t.test('only five recent messages persist and a second tab replaces the first', async () => {
      const replacement = receive(owner, 'room:closed'), tab = await connect('owner');
      const joined = await ack(tab, 'room:join', { channelId: roomId }); assert.equal(joined.messages.length, 5); assert.equal(joined.participants.length, 2); await replacement;
      assert.equal((await ack(owner, 'message:send', { text: 'stale tab' })).ok, false);
      const { db } = await S.mongo(); assert.equal((await db.collection('roomHistory').findOne({ _id: roomId })).messages.length, 5);
    });
    await t.test('age-limit changes close an active room', async () => {
      const tab = sockets[sockets.length - 1], closed = receive(tab, 'room:closed');
      await call('PATCH', `/channels/${roomId}`, { name: 'General', description: '', ageLimit: 120, themeColour: '#4da6ff' }, 'owner'); await closed;
      assert.equal((await ack(tab, 'room:join', { channelId: roomId })).ok, false);
      await call('PATCH', `/channels/${roomId}`, { name: 'General', description: '', ageLimit: 0, themeColour: '#4da6ff' }, 'owner');
      assert((await ack(tab, 'room:join', { channelId: roomId })).ok);
      assert((await ack(member, 'room:join', { channelId: roomId })).ok);
    });
    await t.test('ban approval removes live access immediately', async () => {
      assert((await ack(member, 'message:send', { text: 'Remove with my account' })).ok);
      const state = await call('GET', '/state', undefined, 'owner'), memberId = state.users.find(u => u.username === 'member').id;
      const r = (await call('POST', '/requests', { type: 'banUser', groupId, targetId: memberId, reason: 'Test' }, 'owner')).request;
      const closed = receive(member, 'room:closed'); await call('POST', `/requests/${r.id}/approve`, {}, 'owner'); await closed;
      assert.equal((await ack(member, 'room:join', { channelId: roomId })).ok, false);
    });
    await t.test('account deletion removes retained messages and informs active clients', async () => {
      const memberId = (await call('GET', '/state', undefined, 'owner')).users.find(u => u.username === 'member').id;
      const tab = sockets[sockets.length - 1], update = receive(tab, 'messages:authors');
      await call('DELETE', '/profile', undefined, 'member'); assert(!(await update).ids.includes(memberId));
      const { db } = await S.mongo(); assert(!(await db.collection('roomHistory').findOne({ _id: roomId })).messages.some(m => m.authorId === memberId));
    });
    await t.test('logout prevents further messages on an existing socket', async () => {
      const tab = sockets[sockets.length - 1]; const disconnected = receive(tab, 'disconnect');
      await call('POST', '/auth/logout', {}, 'owner'); await disconnected; assert.equal(tab.connected, false);
    });
    await t.test('room deletion removes its persisted conversation', async () => {
      await call('POST', '/auth/login', { username: 'owner', password: 'Testing123!' }, 'owner');
      await call('DELETE', `/channels/${roomId}`, undefined, 'owner');
      await S.withLock(async () => { const { db } = await S.mongo(); assert.equal(await db.collection('roomHistory').findOne({ _id: roomId }), null); });
    });
  } finally {
    sockets.forEach(socket => socket.disconnect());
    server.closeAllConnections(); await new Promise(resolve => io.close(resolve));
    const { db } = await S.mongo(); await db.dropDatabase(); await S.closeDatabase();
    fs.rmSync(files, { recursive: true, force: true });
  }
});
