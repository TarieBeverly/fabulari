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

## Optional HTTPS configuration

Use an existing trusted localhost certificate; no trust-store changes are performed by the application. Set FRONTEND_ORIGIN=https://localhost:4200, TLS_KEY_PATH and TLS_CERT_PATH in server/.env. Start Angular using `npm start -- --ssl --ssl-key <key-path> --ssl-cert <cert-path>`. Open https://localhost:4200. The frontend follows the page's protocol for HTTP APIs and socket connections. Verify both certificates and secure cookies before claiming HTTPS deployment tested.
