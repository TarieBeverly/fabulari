const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const authRoutes = require('./auth');
const apiRoutes = require('./api');
const app = express();
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
// The local Angular client sends credentialed JSON; reject other browser origins.
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== 'http://localhost:4200') return res.status(403).json({ message: 'Untrusted browser origin.' });
  next();
});
app.use(express.json({ limit: '3mb' }));
app.use(session({ name: 'fabulari.sid', secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60 * 1000 } }));
app.get('/api/health', (req, res) => res.json({ message: 'Fabulari server is running' }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, req, res, next) => {
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'An unexpected server error occurred.' });
});
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = app.listen(port, '127.0.0.1', () => console.log(`Fabulari server: http://localhost:${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = app;
