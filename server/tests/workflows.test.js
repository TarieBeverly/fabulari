const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fabulari-test-'));
process.env.FABULARI_DB = path.join(directory, 'db.json');
const app = require('../index');
test('Phase 1 permissions, requests, age limits, persistence and sessions', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const cookies = {};
  async function call(method, route, body, actor, expected = 200) {
    const headers = { 'Content-Type': 'application/json' };
    if (actor && cookies[actor]) headers.Cookie = cookies[actor];
    const response = await fetch(base + route, { method, headers, ...(body === undefined || method === 'GET' ? {} : { body: JSON.stringify(body) }) });
    if (actor && response.headers.get('set-cookie')) cookies[actor] = response.headers.get('set-cookie').split(';')[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`); return data;
  }
  const account = (username, dob = '2000-01-01') => ({ username, password: 'Testing123!', firstName: username, lastName: 'Tester', email: username + '@example.test', dateOfBirth: dob });
  let owner, member, teen, groupId, roomId;
  try {
    await t.test('bootstrap is available once, profiles validate and registration cannot assign admin roles', async () => {
      assert.equal((await call('GET', '/auth/bootstrap')).required, true);
      await call('POST', '/auth/bootstrap', account('root'), undefined, 201);
      await call('POST', '/auth/bootstrap', account('root2'), undefined, 409);
      await call('POST', '/auth/register', { ...account('bad'), password: 'lowercase' }, undefined, 400);
      await call('POST', '/auth/register', { ...account('bad'), dateOfBirth: '2000-02-31' }, undefined, 400);
      owner = (await call('POST', '/auth/register', { ...account('owner'), roles: ['Super Admin'] }, undefined, 201)).user;
      assert.deepEqual(owner.roles, ['User']); assert.equal(owner.passwordHash, undefined);
      member = (await call('POST', '/auth/register', account('member'), undefined, 201)).user;
      teen = (await call('POST', '/auth/register', account('teen', '2015-01-01'), undefined, 201)).user;
      await call('POST', '/auth/register', account('owner'), undefined, 409);
      for (const name of ['root', 'owner', 'member', 'teen']) await call('POST', '/auth/login', { username: name, password: 'Testing123!' }, name);
    });
    await t.test('authentication, wrong passwords and browser origin rejection', async () => {
      await call('GET', '/state', undefined, undefined, 401);
      await call('POST', '/auth/login', { username: 'owner', password: 'wrong' }, undefined, 401);
      const response = await fetch(base + '/auth/logout', { method: 'POST', headers: { Origin: 'https://untrusted.example' } }); assert.equal(response.status, 403);
    });
    await t.test('group creation requires Super Admin approval; state and JSON exclude password leaks', async () => {
      const r = (await call('POST', '/requests', { type: 'groupCreation', name: 'Adult Group', description: 'Test group', themeColour: '#4da6ff', ageLimit: 18 }, 'owner')).request;
      await call('POST', `/requests/${r.id}/approve`, {}, 'member', 403);
      await call('POST', `/requests/${r.id}/approve`, {}, 'root');
      const state = await call('GET', '/state', undefined, 'owner'); groupId = state.groups[0].id;
      assert.equal(state.groups[0].admin, true); assert.equal(state.user.passwordHash, undefined); assert(!JSON.stringify(state).includes('passwordHash'));
      const stored = JSON.parse(fs.readFileSync(process.env.FABULARI_DB, 'utf8')); assert(stored.groups.some(g => g.id === groupId)); assert(stored.logs.length > 0);
      await call('POST', `/requests/${r.id}/approve`, {}, 'root', 409);
      await call('POST', '/groups', { name: 'Bypass' }, 'root', 404);
    });
    await t.test('membership requests, bans, age validation and protected rooms', async () => {
      await call('POST', '/requests', { type: 'groupJoin', groupId }, 'teen', 403);
      const r = (await call('POST', '/requests', { type: 'groupJoin', groupId }, 'member')).request;
      await call('POST', `/requests/${r.id}/approve`, {}, 'owner');
      roomId = (await call('POST', `/groups/${groupId}/channels`, { name: 'General', description: 'Room', themeColour: '#ffcc60', ageLimit: 18 }, 'owner')).channel.id;
      await call('GET', `/channels/${roomId}/preview`, undefined, 'member');
      await call('GET', `/channels/${roomId}/preview`, undefined, 'teen', 403);
      await call('GET', `/channels/${roomId}/preview`, undefined, 'root', 403);
      await call('POST', `/channels/${roomId}/members`, { userId: member.id }, 'owner');
      await call('PATCH', `/groups/${groupId}`, { name: 'Changed', description: 'Changed', themeColour: '#ffcc60', ageLimit: 18 }, 'member', 403);
    });
    await t.test('room editing/deletion, requests and admin handover safeguard', async () => {
      await call('PATCH', `/channels/${roomId}`, { name: 'Renamed', description: 'Updated', themeColour: '#4da6ff', ageLimit: 18 }, 'owner');
      await call('DELETE', `/groups/${groupId}/admins/me`, {}, 'owner', 409);
      await call('DELETE', '/profile', {}, 'owner', 409);
      await call('POST', `/groups/${groupId}/admins`, { userId: member.id }, 'owner');
      const r = (await call('POST', '/requests', { type: 'channelCreation', groupId, name: 'Requested', description: '', ageLimit: 0, themeColour: '#4da6ff' }, 'member')).request;
      await call('POST', `/requests/${r.id}/approve`, {}, 'owner');
      await call('DELETE', `/channels/${roomId}`, {}, 'owner');
      const deletion = (await call('POST', '/requests', { type: 'accountDeletion', groupId, targetId: member.id, reason: 'Test deletion' }, 'owner')).request;
      await call('DELETE', `/groups/${groupId}/admins/me`, {}, 'owner', 409);
      await call('POST', `/requests/${deletion.id}/reject`, {}, 'root');
      await call('DELETE', `/groups/${groupId}/admins/me`, {}, 'owner');
    });
    await t.test('ban approval prevents rejoining; group deletion cleans references and roles', async () => {
      const ban = (await call('POST', '/requests', { type: 'banUser', groupId, targetId: owner.id, reason: 'Test ban' }, 'member')).request;
      await call('POST', `/requests/${ban.id}/approve`, {}, 'member');
      await call('POST', '/requests', { type: 'groupJoin', groupId }, 'owner', 403);
      const deletion = (await call('POST', '/requests', { type: 'groupDeletion', groupId, reason: 'Test cleanup' }, 'member')).request;
      await call('POST', `/requests/${deletion.id}/approve`, {}, 'root');
      const state = await call('GET', '/state', undefined, 'member'); assert.equal(state.groups.length, 0); assert.equal(state.channels.length, 0); assert.deepEqual(state.user.roles, ['User']);
      await call('DELETE', '/profile', {}, 'root', 403);
    });
    await t.test('logout invalidates the session and self-deletion removes regular users', async () => {
      await call('POST', '/auth/logout', {}, 'owner'); await call('GET', '/auth/me', undefined, 'owner', 401);
      await call('DELETE', '/profile', {}, 'teen'); await call('GET', '/auth/me', undefined, 'teen', 401);
    });
  } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
});
