const fs = require('node:fs');
const path = require('node:path');
const databasePath = process.env.FABULARI_DB || path.join(__dirname, 'data', 'db.json');
function readDatabase() {
  if (!fs.existsSync(databasePath)) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    writeDatabase({ users: [], groups: [], channels: [], requests: [], logs: [] });
  }
  const db = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
  for (const key of ['users', 'groups', 'channels', 'requests', 'logs']) db[key] ||= [];
  return db;
}
function writeDatabase(db) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath + '.tmp', JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(databasePath + '.tmp', databasePath);
}
module.exports = { readDatabase, writeDatabase };
