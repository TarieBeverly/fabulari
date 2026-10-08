const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const S = require('./storage');
const D = require('./domain');
const directory = process.env.FABULARI_UPLOADS || (process.env.FABULARI_DB ? path.join(path.dirname(process.env.FABULARI_DB), 'uploads') : path.join(__dirname, 'uploads'));
const metadataPath = path.join(directory, 'metadata.json');
async function records() {
  if (!S.jsonMode) return (await S.mongo()).db.collection('media').find({}, { projection: { _id: 0 } }).toArray();
  try { return JSON.parse(await fs.readFile(metadataPath, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function save(record) {
  if (!S.jsonMode) return (await S.mongo()).db.collection('media').insertOne(record);
  const rows = await records(); rows.push(record); await fs.writeFile(metadataPath, JSON.stringify(rows));
}
async function remove(record) {
  if (!S.jsonMode) await (await S.mongo()).db.collection('media').deleteOne({ id: record.id });
  else await fs.writeFile(metadataPath, JSON.stringify((await records()).filter(r => r.id !== record.id)));
  await fs.unlink(path.join(directory, record.file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
async function create(data, ownerId, channelId = null, messageId = null) {
  const match = typeof data === 'string' && /^data:image\/(png|jpeg|gif);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!match) D.fail('Choose a PNG, JPEG or GIF image.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : /^GIF8[79]a/.test(bytes.subarray(0, 6).toString());
  if (!valid || !bytes.length || bytes.length > 2097152) D.fail('Choose a valid PNG, JPEG or GIF no larger than 2 MB.');
  await fs.mkdir(directory, { recursive: true });
  const id = randomUUID(), file = id + '.' + match[1];
  const record = { id, ownerId, channelId, messageId, file, contentType: 'image/' + match[1], size: bytes.length };
  await fs.writeFile(path.join(directory, file), bytes);
  try { await save(record); } catch (error) { await fs.unlink(path.join(directory, file)); throw error; }
  return '/api/media/' + id;
}
async function deleteMessage(id) { for (const row of await records()) if (row.messageId === id) await remove(row); }
async function cleanRoom(channelId, retained) {
  const keep = new Set(retained.map(m => m.id));
  for (const row of await records()) if (row.channelId === channelId && !keep.has(row.messageId)) await remove(row);
}
async function cleanDeleted(snapshot) {
  for (const row of await records()) if (!snapshot.users.some(u => u.id === row.ownerId) || (row.channelId && !snapshot.channels.some(c => c.id === row.channelId))) await remove(row);
}
async function serve(req, res) {
  const row = (await records()).find(r => r.id === req.params.mediaId);
  if (!row) D.fail('Image not found.', 404);
  if (row.channelId) {
    const db = await S.readDatabase(), channel = db.channels.find(c => c.id === row.channelId);
    if (!channel) D.fail('Image not found.', 404);
    const group = D.groupById(db, channel.groupId);
    if (!D.isMember(req.currentUser, group)) D.fail('Group membership is required.', 403);
    D.eligible(req.currentUser, group, channel);
  }
  const bytes = await fs.readFile(path.join(directory, row.file));
  res.set({ 'Content-Type': row.contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
  res.send(bytes);
}
module.exports = { create, serve, records, remove, deleteMessage, cleanRoom, cleanDeleted };
