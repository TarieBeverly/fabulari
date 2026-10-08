const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const authRoutes = require('./auth');
const apiRoutes = require('./api');
const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:4200';
const tls = !!(process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH);
app.use(cors({ origin: frontendOrigin, credentials: true }));
// The local Angular client sends credentialed JSON; reject other browser origins.
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== frontendOrigin) return res.status(403).json({ message: 'Untrusted browser origin.' });
  next();
});
app.use(express.json({ limit: '3mb' }));
const sessionMiddleware = session({ name: 'fabulari.sid', secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: tls, maxAge: 60 * 60 * 1000 } });
app.use(sessionMiddleware);
app.get('/api/health', (req, res) => res.json({ message: 'Fabulari server is running' }));
app.use('/api', require('./storage').serializeRequests);
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, req, res, next) => {
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'An unexpected server error occurred.' });
});
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const fs = require('node:fs');
  const server = tls ? require('node:https').createServer({ key: fs.readFileSync(process.env.TLS_KEY_PATH), cert: fs.readFileSync(process.env.TLS_CERT_PATH) }, app) : require('node:http').createServer(app);
  require('./chat').attachChat(server, sessionMiddleware);
  server.listen(port, '127.0.0.1', () => console.log(`Fabulari server: ${tls ? 'https' : 'http'}://localhost:${port} (${require('./storage').jsonMode ? 'JSON compatibility' : 'MongoDB'})`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = app;

module.exports.sessionMiddleware = sessionMiddleware;
