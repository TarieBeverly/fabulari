# Phase 2 startup

Use three separate terminals. Stop the old Phase 1 backend before starting the new backend on port 3000.

1. In server, run `npm install`, then `npm run mongo:dev`. Keep it open. If MongoDB is already running, use that replica set/Atlas URI instead. The first binary download is large; later starts reuse it.
2. In another server terminal, run `npm run migrate:json` once to import Phase 1. If it says MongoDB already contains data, do not delete it; migration already happened or it is an existing database. Run `npm start` and keep the backend open.
3. In client, run `npm install`, then `npm start` and open http://localhost:4200.

The Phase 1 database has already been imported on this computer. Its demo accounts retain their passwords: demo / UserDemo123!, groupadmin / GroupDemo123!, superadmin / SuperDemo123!.

To use Atlas or another replica set, copy server/.env.example to server/.env and set MONGODB_URI and MONGODB_DATABASE. npm start/seed/migrate:json/test:mongo load .env automatically. Never commit .env or local MongoDB files.

## Final walkthrough

Use two separate browser profiles or a private window, so session cookies belong to different accounts. Sign in as demo and groupadmin. Open Photography/General in both. Send text and a small image; confirm each appears in both windows. Delete an own message; confirm both remove it. Verify the participant list changes on leaving. Rejoin after six sends and confirm only the recent five are returned. Open another tab with the same account and confirm the previous room closes. Verify Super Admin has administration controls but cannot chat.

Run `npm run build` in client and `npm test` plus `npm run test:mongo` in server. Commit and push Phase 2 after these checks. Keep the Phase 1 PDF/source snapshot separate from Phase 2 code.

## Local HTTPS deployment

The production Angular build, API, images and Socket.IO share https://localhost:3443. Port 3443 keeps the existing HTTP development servers separate.

1. At the project root, run `npm --prefix client run build`.
2. In server, run `npm run cert:local` once. OpenSSL is required (Git for Windows includes it); OPENSSL_PATH can specify another installed executable. This creates a 30-day certificate valid only for localhost/127.0.0.1 in server/.certs, and does not change Windows trust. An existing key is never overwritten.
3. Copy server/.env.https.example to server/.env.https. Set MongoDB settings for your replica set if needed.
4. Supply a certificate trusted by your browser. For the generated local certificate, explicitly approve trusting server/.certs/localhost.cer in your own Windows account. Never bypass a browser certificate warning or disable certificate validation. The local certificate can be removed from your account's trusted certificates when this project is finished.
5. With MongoDB running, run `npm run start:https` in server. Open https://localhost:3443/login. Angular ng serve is not needed for this deployment.

Keep .env.https, server/.certs and private keys out of Git. Each machine generates its own certificate. The 30-day certificate is for local development, not public hosting; a public deployment needs a certificate for its actual domain.

## HTTPS verification

Run `npm run test:https` in server after building the client, with MongoDB running. All 14 checks passed on 8 October 2026. The tests use a unique test database and temporary uploads/certificate directory, remove their own data, and never modify the application database or Windows trust.

Checks verify rejection of an untrusted certificate, TLS 1.2 or later, the production Angular page/assets, Secure login cookies, certificate-verified WSS chat, images, presence, five-message persistence, deletions, live permission changes and logout. Certificate validation stays enabled throughout. The original HTTP integration suite still passes all 12 checks.
