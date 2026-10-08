if (!process.env.TLS_KEY_PATH || !process.env.TLS_CERT_PATH) throw new Error('Configure .env.https with TLS_KEY_PATH and TLS_CERT_PATH.');
process.env.SERVE_CLIENT = 'true';
process.env.PORT ||= '3443';
process.env.FRONTEND_ORIGIN ||= `https://localhost:${process.env.PORT}`;
const app = require('../index');
const server = app.createServer();
require('../chat').attachChat(server, app.sessionMiddleware);
server.listen(process.env.PORT, '127.0.0.1', () => console.log(`Fabulari HTTPS: ${process.env.FRONTEND_ORIGIN}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
