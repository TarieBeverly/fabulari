const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { randomBytes } = require("node:crypto");
const authRoutes = require("./auth");

const app = express();
const PORT = 3000;

app.use(cors({
  origin: "http://localhost:4200",
  credentials: true
}));

app.use(express.json());

app.use(session({
  name: "fabulari.sid",
  secret: process.env.SESSION_SECRET ||
    randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 1000
  }
}));

app.get("/api/health", (req, res) => {
  res.json({ message: "Fabulari server is running" });
});

app.use("/api/auth", authRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "An unexpected server error occurred."
  });
});

app.listen(PORT, () => {
  console.log(`Fabulari server: http://localhost:${PORT}`);
});