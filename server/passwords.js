const {
  randomBytes,
  scryptSync,
  timingSafeEqual
} = require("node:crypto");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (typeof password !== "string" ||
      typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, hash] = parts;

  if (!/^[a-f0-9]{32}$/.test(salt) ||
      !/^[a-f0-9]{128}$/.test(hash)) {
    return false;
  }

  const expectedHash = Buffer.from(hash, "hex");
  const suppliedHash = scryptSync(password, salt, 64);

  return timingSafeEqual(expectedHash, suppliedHash);
}

module.exports = { hashPassword, verifyPassword };