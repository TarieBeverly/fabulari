const express = require('express');
const { randomUUID } = require('node:crypto');
const { readDatabase, writeDatabase } = require('./storage');
const { hashPassword, verifyPassword } = require('./passwords');
const D = require('./domain');
const router = express.Router();
function createAccount(body, db, roles) {
  const username = D.text(body.username, 'Username', 30);
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) D.fail('Username may contain letters, numbers, dots, hyphens and underscores.');
  const fields = D.profile(body);
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === fields.email)) D.fail('Username or email is already registered.', 409);
  return { id: randomUUID(), username, ...fields, passwordHash: hashPassword(D.password(body.password)), roles, avatar: '' };
}
router.get('/bootstrap', async (req, res) => res.json({ required: (await readDatabase()).users.length === 0 }));
router.post('/bootstrap', async (req, res) => {
  const db = await readDatabase();
  if (db.users.length) D.fail('Initial setup is already complete.', 409);
  const user = createAccount(req.body || {}, db, ['Super Admin']); db.users.push(user);
  D.log(db, user, 'system.bootstrapped', user.id); await writeDatabase(db); res.status(201).json({ user: D.safeUser(user) });
});
router.post('/register', async (req, res) => {
  const db = await readDatabase(); if (!db.users.length) D.fail('Create the initial Super Admin first.', 409);
  const user = createAccount(req.body || {}, db, ['User']); db.users.push(user);
  D.log(db, user, 'user.registered', user.id); await writeDatabase(db); res.status(201).json({ user: D.safeUser(user) });
});
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password || password.length > 128) D.fail('Username and password are required.');
  const user = (await readDatabase()).users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) D.fail('Invalid username or password.', 401);
  req.session.regenerate(error => {
    if (error) return next(error); req.session.userId = user.id;
    req.session.save(error => error ? next(error) : res.json({ user: D.safeUser(user) }));
  });
});
router.post('/logout', async (req, res, next) => {
  const sessionId = req.sessionID;
  req.session.destroy(error => {
  if (error) return next(error); require('./storage').events.emit('sessionEnded', sessionId); res.clearCookie('fabulari.sid', { path: '/' }); res.json({ message: 'Signed out successfully.' });
});
});
router.get('/me', async (req, res) => {
  const user = (await readDatabase()).users.find(u => u.id === req.session.userId);
  if (!user) D.fail('Please sign in.', 401); res.json({ user: D.safeUser(user) });
});
module.exports = router;
module.exports.createAccount = createAccount;
