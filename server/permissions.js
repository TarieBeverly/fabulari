const { readDatabase } = require('./storage');
function requireAuth(req, res, next) {
  const user = readDatabase().users.find(u => u.id === req.session?.userId);
  if (!user) return res.status(401).json({ message: 'Please sign in.' });
  req.currentUser = user; next();
}
function requireSuperAdmin(req, res, next) {
  if (!req.currentUser?.roles.includes('Super Admin')) return res.status(403).json({ message: 'Super Admin access is required.' }); next();
}
module.exports = { requireAuth, requireSuperAdmin };
