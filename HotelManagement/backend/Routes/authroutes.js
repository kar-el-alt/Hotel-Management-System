const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const requireAuth = require("../middleware/auth");
const {
  fail, handle, norm, isValidEmail, passwordProblem, nameProblem, phoneProblem, nextCode, today,
} = require("../lib");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

// ---------- Public ----------
router.post("/auth/login", handle(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: norm(email) });
  const ok = user && (await bcrypt.compare(String(password || ""), user.password));
  if (!ok) fail("Incorrect email or password.", 401);
  if (!user.active) fail("This account is deactivated. Contact the administrator.", 403);
  res.json({ ...user.toJSON(), token: signToken(user) });
}));

router.post("/auth/register", handle(async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  const problem =
    nameProblem(name) ||
    (!isValidEmail(email) && "Enter a valid email address.") ||
    phoneProblem(phone) ||
    passwordProblem(password);
  if (problem) fail(problem);
  if (await User.exists({ email: norm(email) })) fail("An account with this email already exists.", 409);

  const user = await User.create({
    code: await nextCode(User, "USR", 2),
    name: String(name).trim(),
    email: norm(email),
    phone: String(phone).trim(),
    role: "Guest", // self-registration always creates a guest
    password: await bcrypt.hash(password, 10),
    createdAt: today(),
  });
  res.status(201).json(user);
}));

// Always answers the same way, so nobody can find out which emails are registered.
// There is no email service yet, so the code is returned for the demo only.
router.post("/auth/forgot-password", handle(async (req, res) => {
  const { email } = req.body || {};
  if (!isValidEmail(email)) fail("Enter a valid email address.");
  const user = await User.findOne({ email: norm(email) });
  if (!user) return res.json({ sent: true });

  const code = String(crypto.randomInt(100000, 1000000));
  user.resetCode = sha(code);
  user.resetExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  res.json({ sent: true, demoCode: code });
}));

router.post("/auth/reset-password", handle(async (req, res) => {
  const { email, code, password } = req.body || {};
  const user = await User.findOne({ email: norm(email) }).select("+resetCode +resetExpires");
  if (!user || !user.resetCode || user.resetCode !== sha(code))
    fail("That code is not valid. Request a new one.");
  if (Date.now() > user.resetExpires) fail("That code has expired. Request a new one.");
  const problem = passwordProblem(password);
  if (problem) fail(problem);

  user.password = await bcrypt.hash(password, 10);
  user.resetCode = undefined;
  user.resetExpires = undefined;
  await user.save();
  res.json({ reset: true });
}));

// ---------- Signed in ----------
router.post("/auth/change-password", requireAuth, handle(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = req.user;
  if (!(await bcrypt.compare(String(currentPassword || ""), user.password)))
    fail("Your current password is incorrect.");
  const problem = passwordProblem(newPassword);
  if (problem) fail(problem);
  if (newPassword === currentPassword) fail("Choose a password different from your current one.");

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ changed: true });
}));

router.patch("/users/me", requireAuth, handle(async (req, res) => {
  const { name, phone } = req.body || {};
  const problem = nameProblem(name) || phoneProblem(phone);
  if (problem) fail(problem);
  req.user.name = String(name).trim();
  req.user.phone = String(phone).trim();
  await req.user.save();
  res.json(req.user);
}));

module.exports = { router };
