const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const keys = ['users', 'groups', 'channels', 'requests', 'logs'];
const events = new EventEmitter();
const jsonMode = !!process.env.FABULARI_DB || process.env.STORAGE_MODE === 'json';
const databasePath = process.env.FABULARI_DB || path.join(__dirname, 'data', 'db.json');
let connection;
async function mongo() {
  if (!connection) connection = (async () => {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fabulari?replicaSet=fabulari-rs', { serverSelectionTimeoutMS: 10000 });
    try {
      await client.connect();
      const db = client.db(process.env.MONGODB_DATABASE || 'fabulari');
      for (const key of keys) await db.collection(key).createIndex({ id: 1 }, { unique: true });
      return { client, db };
    } catch (error) { await client.close(); connection = undefined; throw error; }
  })();
  return connection;
}
async function readDatabase() {
  if (jsonMode) {
    if (!fs.existsSync(databasePath)) await writeDatabase(Object.fromEntries(keys.map(k => [k, []])));
    const db = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    for (const key of keys) db[key] ||= [];
    return db;
  }
  const { db } = await mongo();
  return Object.fromEntries(await Promise.all(keys.map(async key => [key, await db.collection(key).find({}, { projection: { _id: 0 } }).toArray()])));
}
async function writeDatabase(snapshot) {
  if (jsonMode) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath + '.tmp', JSON.stringify(snapshot, null, 2), 'utf8');
    fs.renameSync(databasePath + '.tmp', databasePath);
  } else {
    const { client, db } = await mongo();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const key of keys) {
          const records = snapshot[key] || [];
          if (records.length) await db.collection(key).bulkWrite(records.map(record => ({ replaceOne: { filter: { id: record.id }, replacement: record, upsert: true } })), { session });
          await db.collection(key).deleteMany({ id: { $nin: records.map(r => r.id) } }, { session });
        }
      });
    } finally { await session.endSession(); }
  }
  events.emit('changed', snapshot);
}
let tail = Promise.resolve();
async function acquire() {
  const previous = tail;
  let release; tail = new Promise(resolve => { release = resolve; });
  await previous; return release;
}
async function withLock(action) { const release = await acquire(); try { return await action(); } finally { release(); } }
async function serializeRequests(req, res, next) {
  const release = await acquire(); let released = false;
  const done = () => { if (!released) { released = true; release(); } };
  res.once('finish', done); res.once('close', done);
  if (res.destroyed) done(); else next();
}
async function closeDatabase() { if (connection) { const { client } = await connection; await client.close(); connection = undefined; } }
module.exports = { readDatabase, writeDatabase, mongo, closeDatabase, withLock, serializeRequests, events, jsonMode };
