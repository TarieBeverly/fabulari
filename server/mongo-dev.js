const path = require('node:path');
const fs = require('node:fs');
const root = path.join(__dirname, '.mongo');
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
process.env.MONGOMS_DOWNLOAD_DIR = path.join(root, 'binaries');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
async function main() {
  const server = await MongoMemoryReplSet.create({
    instanceOpts: [{ port: 27017, dbPath: path.join(root, 'data') }],
    replSet: { name: 'fabulari-rs', count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' }
  });
  console.log('Persistent local MongoDB is ready on port 27017. Keep this terminal open.');
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await server.stop({ doCleanup: false }); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
