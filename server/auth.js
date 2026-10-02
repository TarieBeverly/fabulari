const express = require("express");
const { readDatabase } = require("./storage");
const { verifyPassword } = require("./passwords");

const router = express.Router();

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    roles: user.roles
  };
}

router.post("/login", (req, res, next) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() || !password) {
    return res.status(400).json({
      message: "Username and password are required."
    });
  }

  const database = readDatabase();
  const user = database.users.find(
    (candidate) => candidate.username === username.trim()
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      message: "Invalid username or password."
    });
  }

  req.session.regenerate((error) => {
    if (error) return next(error);

    req.session.userId = user.id;

    req.session.save((error) => {
      if (error) return next(error);
      res.json({ user: safeUser(user) });
    });
  });
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("fabulari.sid", { path: "/" });
    res.json({ message: "Signed out successfully." });
  });
});

router.get("/me", (req, res) => {
  const database = readDatabase();
  const user = database.users.find(
    (candidate) => candidate.id === req.session.userId
  );

  if (!user) {
    return res.status(401).json({
      message: "Please sign in."
    });
  }

  res.json({ user: safeUser(user) });
});

module.exports = router;