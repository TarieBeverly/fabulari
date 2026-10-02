const fs = require("node:fs");
const path = require("node:path");

const databasePath = path.join(__dirname, "data", "db.json");

function readDatabase() {
  const contents = fs.readFileSync(databasePath, "utf8");
  return JSON.parse(contents);
}

function writeDatabase(database) {
  const temporaryPath = `${databasePath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(database, null, 2),
    "utf8"
  );

  fs.renameSync(temporaryPath, databasePath);
}

module.exports = { readDatabase, writeDatabase };