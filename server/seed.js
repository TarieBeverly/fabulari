const { randomUUID } = require("node:crypto");
const { readDatabase, writeDatabase } = require("./storage");
const { hashPassword } = require("./passwords");

const database = readDatabase();

const demoAccounts = [
  {
    username: "superadmin",
    password: "SuperDemo123!",
    roles: ["User", "Super Admin"]
  },
  {
    username: "groupadmin",
    password: "GroupDemo123!",
    roles: ["User", "Group Admin"]
  },
  {
    username: "demo",
    password: "UserDemo123!",
    roles: ["User"]
  }
];

for (const account of demoAccounts) {
  const exists = database.users.some(
    (user) => user.username === account.username
  );

  if (exists) {
    console.log(`Skipped existing account: ${account.username}`);
    continue;
  }

  database.users.push({
    id: randomUUID(),
    username: account.username,
    passwordHash: hashPassword(account.password),
    roles: account.roles
  });

  console.log(`Created demo account: ${account.username}`);
}

writeDatabase(database);
console.log("Demo account setup complete.");