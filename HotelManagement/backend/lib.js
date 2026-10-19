// Shared helpers: errors, dates, validation (same rules as the frontend), paging, activity log
const Event = require("./Models/Event");

// ---------- Errors ----------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status = 400) => {
  throw new HttpError(status, message);
};

// Wraps an async handler: thrown HttpErrors become { error } responses, anything else is a 500
const handle = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err && err.code === 11000) return res.status(409).json({ error: "That record already exists." });
    console.error(err);
    res.status(500).json({ error: "Server error. Check the backend terminal." });
  });

// ---------- Policy ----------
const ACTIVE = ["confirmed", "checked-in"];
const DOWNPAYMENT_RATE = 0.3; // 30% of the room total, non-refundable
const MAX_ACTIVE_BOOKINGS = 3;
const CREATABLE_ROLES = ["Front Desk", "Staff"];

const BASE = ["Air conditioning", "Free Wi-Fi", "In-room safe", "Desk", "Iron and ironing board", "Bathrobes"];
const CLUB = "Club Lounge access";
const ROOM_TYPES = {
  Superior: { price: 4800, capacity: 3, description: "A comfortable air-conditioned room with a desk and free Wi-Fi.", amenities: BASE },
  Deluxe: { price: 5900, capacity: 3, description: "A larger room with more space to work and relax, with free Wi-Fi.", amenities: BASE },
  Club: { price: 7200, capacity: 3, description: "A club-floor room that includes access to the Club Lounge.", amenities: [...BASE, CLUB] },
  "Family Room": { price: 8500, capacity: 5, description: "Extra space and beds for families travelling with children.", amenities: [...BASE, "Rollaway beds"] },
  "Junior Suite": { price: 9800, capacity: 4, description: "A suite with more space than a standard room, with club access.", amenities: [...BASE, CLUB] },
  "Executive Suite": { price: 12500, capacity: 4, description: "The top suite category, with a king bed, one bedroom, and club access.", amenities: [...BASE, CLUB, "Rollaway beds"] },
};
const ROOM_TYPE_NAMES = Object.keys(ROOM_TYPES);

// ---------- Dates (all in the server's local time, like the frontend) ----------
const pad = (n) => String(n).padStart(2, "0");
const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (offset, from) => {
  const d = from ? new Date(`${from}T00:00:00`) : new Date();
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
};
const today = () => addDays(0);
const dateOf = (value) => toIsoDate(new Date(value));
const at = (date, h = 12, m = 0) => new Date(`${date}T${pad(h)}:${pad(m)}:00`);
const nightsBetween = (checkIn, checkOut) =>
  Math.max(0, Math.round((new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000));
const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
const nightsOverlap = (aStart, aEnd, bStart, bEnd) => {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  return end > start ? nightsBetween(start, end) : 0;
};

// ---------- Validation ----------
const norm = (email) => String(email || "").trim().toLowerCase();
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());

const passwordProblem = (password) => {
  if (!password || password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
  return "";
};
const nameProblem = (name, label = "full name") => {
  const v = String(name || "").trim();
  if (!v) return `Enter the ${label}.`;
  if (v.length < 2) return "Use at least 2 characters.";
  if (v.length > 60) return "Use 60 characters or fewer.";
  if (!/^\p{L}[\p{L}\s'.-]*$/u.test(v)) return "Use letters only, with no numbers or symbols.";
  if (/(.)\1{3,}/u.test(v)) return "That does not look like a real name.";
  return "";
};
const phoneProblem = (phone) => {
  const v = String(phone || "").replace(/[\s-]/g, "");
  if (!v) return "Enter a mobile number.";
  if (!/^(\+63|63|0)9\d{9}$/.test(v)) return "Use a Philippine mobile number, like 0917 123 4567.";
  return "";
};
const referenceProblem = (ref) =>
  /^[A-Za-z0-9]{8,20}$/.test(String(ref || "").trim())
    ? ""
    : "Enter the payment reference (8 to 20 letters or numbers).";
const lengthProblem = (value, min, max, label) => {
  const v = String(value || "").trim();
  if (v.length < min) return `${label} needs at least ${min} characters.`;
  if (v.length > max) return `${label} can have up to ${max} characters.`;
  return "";
};

// ---------- Search and paging ----------
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchRe = (q) => new RegExp(escapeRe(String(q).trim()), "i");
const matches = (text, q) => !q || String(text).toLowerCase().includes(String(q).trim().toLowerCase());

const pageParams = (p = {}, defaultSize = 10) => {
  const pageSize = Math.min(100, Math.max(1, Number(p.pageSize) || defaultSize));
  const page = Math.max(1, Number(p.page) || 1);
  return { page, pageSize, skip: (page - 1) * pageSize };
};
// Paging a list that is already in memory
const paginate = (list, p, defaultSize) => {
  const { skip, pageSize } = pageParams(p, defaultSize);
  return { items: list.slice(skip, skip + pageSize), total: list.length };
};
// Paging straight from MongoDB
const pageQuery = async (Model, filter, sort, p, defaultSize) => {
  const { skip, pageSize } = pageParams(p, defaultSize);
  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(pageSize),
    Model.countDocuments(filter),
  ]);
  return { items, total };
};

// ---------- Codes and activity log ----------
async function nextCode(Model, prefix, width, base = 0) {
  const all = await Model.find().select("code").lean();
  const last = all.reduce((max, d) => Math.max(max, Number(String(d.code).split("-")[1]) || 0), base);
  return `${prefix}-${String(last + 1).padStart(width, "0")}`;
}

async function logEvent(actor, type, summary, ref = "") {
  await Event.create({
    code: await nextCode(Event, "EVT", 4),
    at: new Date(),
    type,
    actor: actor ? actor.name : "System",
    summary,
    ref: String(ref),
  });
}

function validateRoomFields(data) {
  if (!ROOM_TYPE_NAMES.includes(data.type)) fail("Choose a room type.");
  const price = Number(data.price);
  if (!Number.isInteger(price) || price < 500 || price > 100000)
    fail("The rate must be a whole number from 500 to 100,000.");
  const capacity = Number(data.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) fail("Capacity must be from 1 to 8 guests.");
  const problem = lengthProblem(data.description, 10, 200, "The description");
  if (problem) fail(problem);
  if (!Array.isArray(data.amenities) || data.amenities.filter((a) => String(a).trim()).length < 1)
    fail("List at least one amenity.");
}

module.exports = {
  HttpError, fail, handle,
  ACTIVE, DOWNPAYMENT_RATE, MAX_ACTIVE_BOOKINGS, CREATABLE_ROLES, ROOM_TYPES, ROOM_TYPE_NAMES,
  pad, toIsoDate, addDays, today, dateOf, at, nightsBetween, formatDate, nightsOverlap,
  norm, isValidEmail, passwordProblem, nameProblem, phoneProblem, referenceProblem, lengthProblem,
  escapeRe, searchRe, matches, pageParams, paginate, pageQuery,
  nextCode, logEvent, validateRoomFields,
};
