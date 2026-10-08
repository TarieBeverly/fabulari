const { randomUUID } = require('node:crypto');
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function text(value, label, max, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(`${label} must contain ${required ? '1' : '0'}–${max} characters.`);
  return value.trim();
}
function birthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Enter a valid date of birth.');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10) || date.getUTCFullYear() < 1900) fail('Enter a valid past date of birth.');
  return value;
}
function age(user) {
  if (!user.dateOfBirth) return -1;
  const now = new Date(); const date = new Date(user.dateOfBirth + 'T00:00:00Z');
  let years = now.getUTCFullYear() - date.getUTCFullYear();
  if (now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) years--;
  return years;
}
function colour(value) { if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value)) fail('Choose a valid theme colour.'); return value; }
function details(body) {
  const limit = Number(body.ageLimit);
  if (!Number.isInteger(limit) || limit < 0 || limit > 120) fail('Age limit must be a whole number from 0 to 120.');
  return { name: text(body.name, 'Name', 30), description: text(body.description, 'Description', 250, false), themeColour: colour(body.themeColour || '#4da6ff'), ageLimit: limit };
}
function profile(body) {
  const email = text(body.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
  return { firstName: text(body.firstName, 'First name', 60), lastName: text(body.lastName, 'Last name', 60), email, dateOfBirth: birthDate(body.dateOfBirth), themeColour: body.themeColour ? colour(body.themeColour) : '' };
}
function password(value) { if (typeof value !== 'string' || value.length < 8 || value.length > 128 || !/[A-Z]/.test(value)) fail('Password needs 8–128 characters and at least one uppercase letter.'); return value; }
function safeUser(user) { const { passwordHash, ...safe } = user; return safe; }
function isSuper(user) { return user.roles.includes('Super Admin'); }
function isAdmin(user, group) { return !isSuper(user) && group.adminIds.includes(user.id) && !group.bannedUserIds.includes(user.id); }
function isMember(user, group) { return !isSuper(user) && group.memberIds.includes(user.id) && !group.bannedUserIds.includes(user.id); }
function groupById(db, id) { const group = db.groups.find(g => g.id === id); if (!group) fail('Group not found.', 404); return group; }
function admin(user, group) { if (!isAdmin(user, group)) fail('You must administer this group.', 403); }
function eligible(user, group, room) {
  if (isSuper(user)) fail('Super Admin accounts do not use chat or join groups.', 403);
  if (group.bannedUserIds.includes(user.id)) fail('You are banned from this group.', 403);
  const limit = Math.max(group.ageLimit, room?.ageLimit || 0);
  if (age(user) < limit) fail(`You must be at least ${limit} years old. Complete your date of birth in Profile.`, 403);
}
function log(db, user, action, targetId, groupId = null) { db.logs.push({ id: randomUUID(), actorId: user.id, actorName: user.username, action, targetId, groupId, createdAt: new Date().toISOString() }); }
function syncRoles(db) { for (const user of db.users) if (!isSuper(user)) user.roles = db.groups.some(g => g.adminIds.includes(user.id)) ? ['User', 'Group Admin'] : ['User']; }
function removeUser(db, target, actor) {
  if (isSuper(target)) fail('Super Admin accounts cannot be deleted.', 403);
  if (db.groups.some(g => g.adminIds.includes(target.id) && g.adminIds.length === 1)) fail('Appoint another administrator before deleting this user.', 409);
  for (const g of db.groups) for (const key of ['memberIds', 'adminIds', 'bannedUserIds']) g[key] = g[key].filter(id => id !== target.id);
  for (const c of db.channels) c.memberIds = (c.memberIds || []).filter(id => id !== target.id);
  db.users = db.users.filter(u => u.id !== target.id);
  for (const r of db.requests) if (r.status === 'pending' && (r.requesterId === target.id || r.targetId === target.id)) { r.status = 'cancelled'; r.reviewedBy = actor.id; }
  log(db, actor, 'user.deleted', target.id); syncRoles(db);
}
module.exports = { fail, text, birthDate, age, colour, details, profile, password, safeUser, isSuper, isAdmin, isMember, groupById, admin, eligible, log, syncRoles, removeUser };
