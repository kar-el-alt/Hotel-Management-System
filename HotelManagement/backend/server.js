require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const { router: hotelRouter, publicRouter } = require("./Routes/hotelroutes");
const { router: authRouter } = require("./Routes/authroutes");
const { seedIfEmpty } = require("./seed");
const requireAuth = require("./middleware/auth");

const PORT = process.env.PORT || 8000;

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("Missing MONGO_URI or JWT_SECRET. Create backend/.env (see .env.example).");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

// Public: quick check that the server is up (open http://localhost:8000/api/health)
app.get("/api/health", (req, res) => res.json({ ok: true, database: mongoose.connection.name }));

// Login, register, forgot/reset password. Protected inside: /users/me, /auth/change-password
app.use("/api", authRouter);

// Public room list and availability (the home page works before signing in)
app.use("/api", publicRouter);

// Everything else needs a signed-in user; each route checks the role
app.use("/api", requireAuth, hotelRouter);

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log(`MongoDB connected -> database "${mongoose.connection.name}"`);
    await seedIfEmpty(); // users, rooms, reservations, events
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}/api`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
