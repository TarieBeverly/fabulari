const { randomUUID } = require('node:crypto');
const { readDatabase, writeDatabase } = require('./storage');
const { hashPassword } = require('./passwords');
const db = readDatabase();
for (const [username, password, roles] of [
  ['superadmin', 'SuperDemo123!', ['Super Admin']],
  ['groupadmin', 'GroupDemo123!', ['User', 'Group Admin']],
  ['demo', 'UserDemo123!', ['User']]
]) {
  let user = db.users.find(u => u.username === username);
  if (!user) {
    user = { id: randomUUID(), username, passwordHash: hashPassword(password), roles };
    db.users.push(user);
    console.log('Created demo account:', username);
  }
  for (const [key, value] of Object.entries({ firstName: username[0].toUpperCase() + username.slice(1), lastName: 'Demo', email: username + '@example.test', dateOfBirth: '2000-01-01', themeColour: '', avatar: '' })) if (user[key] === undefined) user[key] = value;
  if (username === 'superadmin') user.roles = ['Super Admin'];
}
if (!db.groups.some(g => g.demoFixture)) {
  const admin = db.users.find(u => u.username === 'groupadmin'), member = db.users.find(u => u.username === 'demo'), superUser = db.users.find(u => u.username === 'superadmin');
  const group = { id: randomUUID(), name: 'Photography', description: 'A demo community for sharing ideas, photos and creative inspiration.', themeColour: '#4da6ff', ageLimit: 0, adminIds: [admin.id], memberIds: [admin.id, member.id], bannedUserIds: [], demoFixture: true };
  if (!db.groups.some(g => g.name.toLowerCase() === group.name.toLowerCase())) {
    db.groups.push(group);
    admin.roles = ['User', 'Group Admin'];
    for (const name of ['General', 'Events']) db.channels.push({ id: randomUUID(), groupId: group.id, name, description: name === 'General' ? 'Meet the community and share your ideas.' : 'Plan the next photo walk.', themeColour: '#4da6ff', ageLimit: 0, memberIds: [...group.memberIds] });
    db.requests.push({ id: randomUUID(), type: 'groupCreation', requesterId: admin.id, groupId: null, targetId: group.id, payload: { name: group.name, description: group.description, themeColour: group.themeColour, ageLimit: 0 }, reason: 'Sample data fixture, not a real administrative decision.', status: 'approved', reviewedBy: superUser.id, createdAt: new Date().toISOString(), demoFixture: true });
    db.logs.push({ id: randomUUID(), actorId: superUser.id, actorName: 'demo seed', action: 'demo.fixture.created', targetId: group.id, groupId: group.id, createdAt: new Date().toISOString() });
    console.log('Added Photography sample group and rooms.');
  }
}
writeDatabase(db);
console.log('Demo setup complete. Existing accounts and passwords were preserved.');
