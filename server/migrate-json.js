const fs = require('node:fs');
const path = require('node:path');
const { readDatabase, writeDatabase, closeDatabase, jsonMode } = require('./storage');
async function main() {
  if (jsonMode) throw new Error('Migration requires MongoDB mode. Remove FABULARI_DB and STORAGE_MODE=json.');
  const existing = await readDatabase();
  if (Object.values(existing).some(records => records.length)) throw new Error('Migration stopped: MongoDB already contains data. Nothing was overwritten.');
  const source = process.argv[2] || path.join(__dirname, 'data', 'db.json');
  const snapshot = JSON.parse(fs.readFileSync(source, 'utf8'));
  for (const key of ['users', 'groups', 'channels', 'requests', 'logs']) if (!Array.isArray(snapshot[key])) throw new Error('Invalid JSON collection: ' + key);
  await writeDatabase(snapshot);
  console.log('Phase 1 data imported. Existing account IDs and password hashes were preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(closeDatabase);
