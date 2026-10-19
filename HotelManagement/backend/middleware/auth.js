const jwt = require("jsonwebtoken");
const User = require("../Models/User");

// Reads "Authorization: Bearer <token>" (the frontend realApi.js already sends it)
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please sign in." });

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(sub);
    if (!user || !user.active) return res.status(401).json({ error: "Please sign in again." });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Your session expired. Please sign in again." });
  }
}

// Use after requireAuth: allow("Admin", "Front Desk")
requireAuth.allow = (...roles) => (req, res, next) =>
  req.user && roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: "You do not have permission to do that." });

module.exports = requireAuth;
