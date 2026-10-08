const express = require('express');
const { randomUUID } = require('node:crypto');
const { readDatabase, writeDatabase } = require('./storage');
const { requireAuth } = require('./permissions');
const { createAccount } = require('./auth');
const { hashPassword } = require('./passwords');
const D = require('./domain');
const router = express.Router();
router.use(requireAuth);
function finish(db, user, action, targetId, groupId, res, data = {}) {
  D.log(db, user, action, targetId, groupId); writeDatabase(db); res.json({ message: 'Changes saved.', ...data });
}
function requestVisible(user, r, db) {
  if (r.requesterId === user.id) return true;
  if (D.isSuper(user)) return ['groupCreation', 'groupDeletion', 'accountDeletion'].includes(r.type);
  const group = db.groups.find(g => g.id === r.groupId);
  return group && D.isAdmin(user, group) && ['groupJoin', 'channelCreation', 'banUser'].includes(r.type);
}
router.get('/state', (req, res) => {
  const db = readDatabase(), user = req.currentUser;
  const groups = db.groups.map(g => ({ ...g, member: D.isMember(user, g), admin: D.isAdmin(user, g), banned: g.bannedUserIds.includes(user.id) }));
  const channels = db.channels.filter(c => { const g = db.groups.find(g => g.id === c.groupId); return g && D.isMember(user, g); });
  const users = db.users.map(u => D.isSuper(user) ? D.safeUser(u) : { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, avatar: u.avatar, roles: u.roles });
  const requests = db.requests.filter(r => requestVisible(user, r, db)).map(r => ({ ...r, requesterName: db.users.find(u => u.id === r.requesterId)?.username || 'Deleted user', groupName: db.groups.find(g => g.id === r.groupId)?.name || '' }));
  const logs = db.logs.filter(l => D.isSuper(user) || (l.groupId && db.groups.some(g => g.id === l.groupId && D.isAdmin(user, g)))).slice(-100).reverse();
  res.json({ user: D.safeUser(user), groups, channels, users, requests, logs });
});
router.get('/groups', (req, res) => {
  const db = readDatabase(); res.json({ groups: db.groups.filter(g => D.isSuper(req.currentUser) || D.isMember(req.currentUser, g)) });
});
router.post('/users', (req, res) => {
  if (!D.isSuper(req.currentUser)) D.fail('Super Admin access is required.', 403);
  const db = readDatabase(); const user = createAccount(req.body || {}, db, ['User']); db.users.push(user);
  finish(db, req.currentUser, 'user.created', user.id, null, res, { user: D.safeUser(user) });
});
router.patch('/profile', (req, res) => {
  const db = readDatabase(), user = db.users.find(u => u.id === req.currentUser.id), body = req.body || {};
  const fields = D.profile(body);
  if (db.users.some(u => u.id !== user.id && u.email?.toLowerCase() === fields.email)) D.fail('Email is already registered.', 409);
  Object.assign(user, fields);
  if (body.password) user.passwordHash = hashPassword(D.password(body.password));
  finish(db, user, 'profile.updated', user.id, null, res, { user: D.safeUser(user) });
});
router.post('/profile/avatar', (req, res) => {
  const data = req.body?.data;
  if (typeof data !== 'string') D.fail('Choose a PNG, JPEG or GIF image.');
  const match = /^data:image\/(png|jpeg|gif);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!match) D.fail('Choose a PNG, JPEG or GIF image.');
  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > 2 * 1024 * 1024) D.fail('Image must be no larger than 2 MB.');
  const valid = match[1] === 'png' ? image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' : match[1] === 'jpeg' ? image[0] === 255 && image[1] === 216 && image[2] === 255 : /^GIF8[79]a/.test(image.subarray(0, 6).toString());
  if (!valid) D.fail('The file does not match its image type.');
  const db = readDatabase(), user = db.users.find(u => u.id === req.currentUser.id); user.avatar = data;
  finish(db, user, 'profile.avatar.updated', user.id, null, res);
});
router.delete('/profile', (req, res) => {
  const db = readDatabase(); D.removeUser(db, req.currentUser, req.currentUser); writeDatabase(db);
  req.session.destroy(() => {}); res.clearCookie('fabulari.sid', { path: '/' }); res.json({ message: 'Account deleted.' });
});
router.patch('/groups/:groupId', (req, res) => {
  const db = readDatabase(), group = D.groupById(db, req.params.groupId); D.admin(req.currentUser, group);
  const fields = D.details(req.body || {});
  if (db.groups.some(g => g.id !== group.id && g.name.toLowerCase() === fields.name.toLowerCase())) D.fail('Group name is already in use.', 409);
  Object.assign(group, fields); finish(db, req.currentUser, 'group.updated', group.id, group.id, res);
});
router.post('/groups/:groupId/members', (req, res) => {
  const db = readDatabase(), group = D.groupById(db, req.params.groupId); D.admin(req.currentUser, group);
  const request = db.requests.find(r => r.id === req.body?.requestId && r.type === 'groupJoin' && r.groupId === group.id && r.status === 'pending');
  if (!request) D.fail('Membership assignment requires a pending join request.');
  approve(db, req.currentUser, request, req.body || {}); finish(db, req.currentUser, 'membership.assigned', request.requesterId, group.id, res);
});
router.delete('/groups/:groupId/members/:userId', (req, res) => {
  const db = readDatabase(), group = D.groupById(db, req.params.groupId), actor = req.currentUser, target = req.params.userId;
  if (target !== actor.id) D.admin(actor, group);
  if (!group.memberIds.includes(target)) D.fail('Member not found.', 404);
  if (group.adminIds.includes(target)) D.fail('Step down as administrator before leaving the group.', 409);
  group.memberIds = group.memberIds.filter(id => id !== target);
  for (const c of db.channels.filter(c => c.groupId === group.id)) c.memberIds = (c.memberIds || []).filter(id => id !== target);
  finish(db, actor, 'membership.removed', target, group.id, res);
});
router.post('/groups/:groupId/admins', (req, res) => {
  const db = readDatabase(), group = D.groupById(db, req.params.groupId); D.admin(req.currentUser, group);
  const target = req.body?.userId;
  if (!group.memberIds.includes(target) || group.bannedUserIds.includes(target)) D.fail('Choose an existing group member.');
  if (!group.adminIds.includes(target)) group.adminIds.push(target); D.syncRoles(db);
  finish(db, req.currentUser, 'admin.promoted', target, group.id, res);
});
router.delete('/groups/:groupId/admins/me', (req, res) => {
  const db = readDatabase(), group = D.groupById(db, req.params.groupId); D.admin(req.currentUser, group);
  if (group.adminIds.length <= 1) D.fail('Appoint another administrator before stepping down.', 409);
  if (db.requests.some(r => r.requesterId === req.currentUser.id && r.status === 'pending' && ['groupDeletion', 'accountDeletion'].includes(r.type))) D.fail('Resolve pending Super Admin requests before stepping down.', 409);
  group.adminIds = group.adminIds.filter(id => id !== req.currentUser.id); D.syncRoles(db);
  finish(db, req.currentUser, 'admin.steppedDown', req.currentUser.id, group.id, res);
});
router.post('/groups/:groupId/channels', (req, res) => {
  const db = readDatabase(), group = D.groupById(db, req.params.groupId); D.admin(req.currentUser, group);
  const fields = D.details(req.body || {});
  if (db.channels.some(c => c.groupId === group.id && c.name.toLowerCase() === fields.name.toLowerCase())) D.fail('Room name is already in use in this group.', 409);
  const channel = { id: randomUUID(), groupId: group.id, ...fields, memberIds: [...group.memberIds] }; db.channels.push(channel);
  finish(db, req.currentUser, 'channel.created', channel.id, group.id, res, { channel });
});
router.patch('/channels/:channelId', (req, res) => {
  const db = readDatabase(), channel = db.channels.find(c => c.id === req.params.channelId); if (!channel) D.fail('Room not found.', 404);
  const group = D.groupById(db, channel.groupId); D.admin(req.currentUser, group); const fields = D.details(req.body || {});
  if (db.channels.some(c => c.id !== channel.id && c.groupId === group.id && c.name.toLowerCase() === fields.name.toLowerCase())) D.fail('Room name is already in use.', 409);
  Object.assign(channel, fields); finish(db, req.currentUser, 'channel.updated', channel.id, group.id, res);
});
router.delete('/channels/:channelId', (req, res) => {
  const db = readDatabase(), channel = db.channels.find(c => c.id === req.params.channelId); if (!channel) D.fail('Room not found.', 404);
  D.admin(req.currentUser, D.groupById(db, channel.groupId)); db.channels = db.channels.filter(c => c.id !== channel.id);
  finish(db, req.currentUser, 'channel.deleted', channel.id, channel.groupId, res);
});
router.post('/channels/:channelId/members', (req, res) => {
  const db = readDatabase(), channel = db.channels.find(c => c.id === req.params.channelId); if (!channel) D.fail('Room not found.', 404);
  const group = D.groupById(db, channel.groupId); D.admin(req.currentUser, group);
  const user = db.users.find(u => u.id === req.body?.userId); if (!user || !D.isMember(user, group)) D.fail('Choose a member of this group.'); D.eligible(user, group, channel);
  channel.memberIds ||= []; if (!channel.memberIds.includes(user.id)) channel.memberIds.push(user.id);
  finish(db, req.currentUser, 'channel.member.assigned', user.id, group.id, res);
});
router.get('/channels/:channelId/preview', (req, res) => {
  const db = readDatabase(), channel = db.channels.find(c => c.id === req.params.channelId); if (!channel) D.fail('Room not found.', 404);
  const group = D.groupById(db, channel.groupId); if (!D.isMember(req.currentUser, group)) D.fail('Join this group before opening a room.', 403); D.eligible(req.currentUser, group, channel);
  res.json({ channel, mock: true });
});
router.post('/requests', (req, res) => {
  const db = readDatabase(), user = req.currentUser, body = req.body || {};
  if (D.isSuper(user)) D.fail('Use a regular account to submit community requests.', 403);
  const type = body.type, allowed = ['groupCreation', 'groupJoin', 'channelCreation', 'banUser', 'groupDeletion', 'accountDeletion'];
  if (!allowed.includes(type)) D.fail('Unknown request type.');
  let group, payload = {}, targetId = body.targetId || null;
  if (type !== 'groupCreation') group = D.groupById(db, body.groupId);
  if (type === 'groupCreation') { payload = D.details(body); if (db.groups.some(g => g.name.toLowerCase() === payload.name.toLowerCase())) D.fail('Group name is already in use.', 409); }
  if (type === 'groupJoin') { D.eligible(user, group); if (D.isMember(user, group)) D.fail('You already belong to this group.', 409); targetId = user.id; }
  if (['channelCreation', 'banUser'].includes(type)) { if (!D.isMember(user, group)) D.fail('Join this group before making this request.', 403); }
  if (type === 'channelCreation') payload = D.details(body);
  if (type === 'banUser') { if (!group.memberIds.includes(targetId) || targetId === user.id) D.fail('Choose another member of this group.'); }
  if (['groupDeletion', 'accountDeletion'].includes(type)) D.admin(user, group);
  if (type === 'groupDeletion') targetId = group.id;
  if (type === 'accountDeletion' && !group.memberIds.includes(targetId) && !group.bannedUserIds.includes(targetId)) D.fail('Choose a current or banned member of your group.');
  const reason = D.text(body.reason || '', 'Reason', 500, ['banUser', 'groupDeletion', 'accountDeletion'].includes(type));
  if (db.requests.some(r => r.type === type && r.requesterId === user.id && r.groupId === (group?.id || null) && r.targetId === targetId && r.status === 'pending')) D.fail('You already have a pending request of this type.', 409);
  const request = { id: randomUUID(), type, requesterId: user.id, groupId: group?.id || null, targetId, payload, reason, status: 'pending', createdAt: new Date().toISOString(), reviewedBy: null };
  db.requests.push(request); finish(db, user, 'request.submitted', request.id, group?.id, res, { request });
});
function reviewer(db, actor, request) {
  if (['groupCreation', 'groupDeletion', 'accountDeletion'].includes(request.type)) { if (!D.isSuper(actor)) D.fail('Super Admin access is required.', 403); }
  else D.admin(actor, D.groupById(db, request.groupId));
}
function approve(db, actor, request, body) {
  reviewer(db, actor, request);
  const requester = db.users.find(u => u.id === request.requesterId); if (!requester) D.fail('Requester no longer exists.', 409);
  const group = request.groupId ? D.groupById(db, request.groupId) : null;
  if (['groupDeletion', 'accountDeletion'].includes(request.type) && !D.isAdmin(requester, group)) D.fail('Requester no longer administers this group.', 409);
  switch (request.type) {
    case 'groupCreation': {
      if (db.groups.some(g => g.name.toLowerCase() === request.payload.name.toLowerCase())) D.fail('Group name is already in use.', 409);
      const g = { id: randomUUID(), ...D.details(request.payload), adminIds: [requester.id], memberIds: [requester.id], bannedUserIds: [] }; D.eligible(requester, g);
      db.groups.push(g); request.targetId = g.id; D.log(db, actor, 'group.created', g.id, g.id); break;
    }
    case 'groupJoin': {
      D.eligible(requester, group); if (!group.memberIds.includes(requester.id)) group.memberIds.push(requester.id);
      for (const c of db.channels.filter(c => c.groupId === group.id)) { c.memberIds ||= []; if (!c.memberIds.includes(requester.id)) c.memberIds.push(requester.id); }
      D.log(db, actor, 'membership.assigned', requester.id, group.id); break;
    }
    case 'channelCreation': {
      if (!D.isMember(requester, group)) D.fail('Requester no longer belongs to this group.', 409);
      if (db.channels.some(c => c.groupId === group.id && c.name.toLowerCase() === request.payload.name.toLowerCase())) D.fail('Room name is already in use.', 409);
      const c = { id: randomUUID(), groupId: group.id, ...D.details(request.payload), memberIds: [...group.memberIds] }; db.channels.push(c); request.targetId = c.id; D.log(db, actor, 'channel.created', c.id, group.id); break;
    }
    case 'banUser': {
      if (!D.isMember(requester, group)) D.fail('Requester no longer belongs to this group.', 409);
      const id = request.targetId;
      if (!group.memberIds.includes(id)) D.fail('Target no longer belongs to this group.', 409);
      if (group.adminIds.includes(id) && group.adminIds.length === 1) D.fail('Appoint another administrator before banning this user.', 409);
      if (!group.bannedUserIds.includes(id)) group.bannedUserIds.push(id);
      group.memberIds = group.memberIds.filter(x => x !== id); group.adminIds = group.adminIds.filter(x => x !== id);
      for (const c of db.channels.filter(c => c.groupId === group.id)) c.memberIds = (c.memberIds || []).filter(x => x !== id);
      D.log(db, actor, 'member.banned', id, group.id); break;
    }
    case 'groupDeletion': {
      db.groups = db.groups.filter(g => g.id !== group.id); db.channels = db.channels.filter(c => c.groupId !== group.id);
      for (const r of db.requests) if (r.id !== request.id && r.groupId === group.id && r.status === 'pending') r.status = 'cancelled';
      D.log(db, actor, 'group.deleted', group.id, group.id); break;
    }
    case 'accountDeletion': {
      const target = db.users.find(u => u.id === request.targetId); if (!target) D.fail('User no longer exists.', 404); D.removeUser(db, target, actor); break;
    }
    default: D.fail('Unsupported request type.');
  }
  request.status = 'approved'; request.reviewedBy = actor.id; request.reviewedAt = new Date().toISOString(); D.syncRoles(db);
}
router.post('/requests/:requestId/:decision', (req, res) => {
  const db = readDatabase(), request = db.requests.find(r => r.id === req.params.requestId);
  if (!request) D.fail('Request not found.', 404); if (request.status !== 'pending') D.fail('Request has already been processed.', 409);
  reviewer(db, req.currentUser, request);
  if (req.params.decision === 'approve') approve(db, req.currentUser, request, req.body || {});
  else if (req.params.decision === 'reject') { request.status = 'rejected'; request.reviewedBy = req.currentUser.id; request.reviewedAt = new Date().toISOString(); }
  else D.fail('Unknown decision.');
  finish(db, req.currentUser, 'request.' + request.status, request.id, request.groupId, res);
});
module.exports = router;
