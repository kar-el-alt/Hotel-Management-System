const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../Models/User");
const Room = require("../Models/Room");
const Reservation = require("../Models/Reservation");
const Event = require("../Models/Event");
const requireAuth = require("../middleware/auth");
const L = require("../lib");

const { allow } = requireAuth;
const { fail, handle, ACTIVE, norm } = L;

// publicRouter: no sign-in needed (the home page lists rooms and checks availability)
// router: everything else, mounted behind requireAuth in server.js
const publicRouter = express.Router();
const router = express.Router();

// ---------- Helpers ----------
const findRoom = async (number) => {
  const room = await Room.findOne({ number: Number(number) });
  if (!room) fail("Room not found.", 404);
  return room;
};
const findReservation = async (id) => {
  const r = await Reservation.findOne({ code: id });
  if (!r) fail("Reservation not found.", 404);
  return r;
};

// Adds roomType to reservations, which the frontend tables show
async function withRoomType(docs) {
  const rooms = await Room.find().select("number type");
  const types = new Map(rooms.map((r) => [r.number, r.type]));
  const one = (d) => ({ ...d.toJSON(), roomType: types.get(d.roomNumber) || "Removed room" });
  return Array.isArray(docs) ? docs.map(one) : one(docs);
}

// Room numbers that already have an active booking overlapping these dates
async function bookedNumbers(checkIn, checkOut, ignoreCode) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return new Set();
  const filter = {
    status: { $in: ACTIVE },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (ignoreCode) filter.code = { $ne: ignoreCode };
  return new Set(await Reservation.distinct("roomNumber", filter));
}

const availability = (room, p, booked) => {
  const { checkIn, checkOut, adults = 1, children = 0 } = p;
  if (room.status === "maintenance") return { available: false, reason: "Under maintenance" };
  if (Number(adults) + Number(children) > room.capacity)
    return { available: false, reason: `Sleeps up to ${room.capacity}` };
  if (!checkIn || !checkOut) return { available: true, reason: "" };
  if (checkOut <= checkIn) return { available: false, reason: "Choose valid dates" };
  if (booked.has(room.number)) return { available: false, reason: "Booked for these dates" };
  return { available: true, reason: "" };
};

// ====================================================================
// PUBLIC: rooms
// ====================================================================
publicRouter.get("/rooms", handle(async (req, res) => {
  const p = req.query;
  const filter = {};
  if (p.type) filter.type = p.type;
  if (p.status) filter.status = p.status;
  if (p.floor) filter.floor = Number(p.floor);
  let rooms = await Room.find(filter).sort({ number: 1 });
  if (p.search) rooms = rooms.filter((r) => L.matches(`${r.number} ${r.type} ${r.description}`, p.search));
  const booked = await bookedNumbers(p.checkIn, p.checkOut);
  let list = rooms.map((r) => ({ ...r.toJSON(), availability: availability(r, p, booked) }));
  if (p.onlyAvailable === "true") list = list.filter((r) => r.availability.available);
  res.json(L.paginate(list, p));
}));

publicRouter.get("/rooms/floors", handle(async (req, res) => {
  const floors = await Room.distinct("floor");
  res.json(floors.sort((a, b) => a - b));
}));

publicRouter.get("/rooms/:number/availability", handle(async (req, res) => {
  const room = await findRoom(req.params.number);
  const booked = await bookedNumbers(req.query.checkIn, req.query.checkOut);
  res.json(availability(room, req.query, booked));
}));

// ====================================================================
// USERS (Admin)
// ====================================================================
router.get("/users", allow("Admin"), handle(async (req, res) => {
  const p = req.query;
  const filter = {};
  if (p.role) filter.role = p.role;
  if (p.status === "Active") filter.active = true;
  if (p.status === "Deactivated") filter.active = false;
  if (p.search) {
    const re = L.searchRe(p.search);
    filter.$or = [{ code: re }, { name: re }, { email: re }, { phone: re }];
  }
  res.json(await L.pageQuery(User, filter, { code: 1 }, p));
}));

router.post("/users", allow("Admin"), handle(async (req, res) => {
  const data = req.body || {};
  const email = norm(data.email);
  const problem =
    L.nameProblem(data.name) ||
    (!L.isValidEmail(email) && "Enter a valid email address.") ||
    L.phoneProblem(data.phone) ||
    (!L.CREATABLE_ROLES.includes(data.role) && "Choose Front Desk or Staff.") ||
    L.passwordProblem(data.password);
  if (problem) fail(problem);
  if (await User.exists({ email })) fail("An account with this email already exists.", 409);

  const user = await User.create({
    code: await L.nextCode(User, "USR", 2),
    name: String(data.name).trim(),
    email,
    phone: String(data.phone).trim(),
    role: data.role, // fixed for the life of the account
    password: await bcrypt.hash(data.password, 10),
    createdAt: L.today(),
  });
  await L.logEvent(req.user, "user.created", `${req.user.name} created a ${user.role} account for ${user.name}`, user.code);
  res.status(201).json(user);
}));

router.post("/users/:id/deactivate", allow("Admin"), handle(async (req, res) => {
  const user = await User.findOne({ code: req.params.id });
  if (!user) fail("User not found.", 404);
  if (user.email === norm(req.user.email)) fail("You can't deactivate your own account.");
  if (user.role === "Admin") fail("The admin account cannot be deactivated.");
  const problem = L.lengthProblem(req.body && req.body.reason, 5, 200, "The reason");
  if (problem) fail(problem);
  user.active = false;
  user.deactivationReason = String(req.body.reason).trim();
  await user.save();
  await L.logEvent(req.user, "user.deactivated", `${user.name} was deactivated: ${user.deactivationReason}`, user.code);
  res.json(user);
}));

router.post("/users/:id/reactivate", allow("Admin"), handle(async (req, res) => {
  const user = await User.findOne({ code: req.params.id });
  if (!user) fail("User not found.", 404);
  user.active = true;
  user.deactivationReason = "";
  await user.save();
  await L.logEvent(req.user, "user.reactivated", `${user.name} was reactivated`, user.code);
  res.json(user);
}));

// ====================================================================
// ROOMS (Admin manages, Staff cleans)
// ====================================================================
router.post("/rooms", allow("Admin"), handle(async (req, res) => {
  const data = req.body || {};
  const number = Number(data.number);
  if (!Number.isInteger(number) || number < 1 || number > 9999) fail("Enter a room number from 1 to 9999.");
  if (await Room.exists({ number })) fail(`Room ${number} already exists.`, 409);
  L.validateRoomFields(data);
  const room = await Room.create({
    number,
    type: data.type,
    floor: Math.max(1, Math.floor(number / 100)),
    price: Number(data.price),
    capacity: Number(data.capacity),
    description: String(data.description).trim(),
    amenities: data.amenities.map((a) => String(a).trim()).filter(Boolean),
  });
  await L.logEvent(req.user, "room.created", `Room ${number} (${room.type}) was added`, number);
  res.status(201).json(room);
}));

router.patch("/rooms/:number", allow("Admin"), handle(async (req, res) => {
  const data = req.body || {};
  const room = await findRoom(req.params.number);
  L.validateRoomFields(data);
  const tooMany = await Reservation.findOne({
    roomNumber: room.number,
    status: { $in: ACTIVE },
    guests: { $gt: Number(data.capacity) },
  });
  if (tooMany) fail(`Booking ${tooMany.code} has ${tooMany.guests} guests, which is more than ${data.capacity}.`);
  room.type = data.type;
  room.price = Number(data.price);
  room.capacity = Number(data.capacity);
  room.description = String(data.description).trim();
  room.amenities = data.amenities.map((a) => String(a).trim()).filter(Boolean);
  await room.save();
  await L.logEvent(req.user, "room.updated", `Room ${room.number} details were updated`, room.number);
  res.json(room);
}));

router.delete("/rooms/:number", allow("Admin"), handle(async (req, res) => {
  const room = await findRoom(req.params.number);
  if (room.status === "occupied") fail(`Room ${room.number} has a guest checked in.`);
  const active = await Reservation.countDocuments({ roomNumber: room.number, status: { $in: ACTIVE } });
  if (active) fail(`Room ${room.number} has ${active} active booking(s). Cancel or complete them first.`);
  await room.deleteOne();
  await L.logEvent(req.user, "room.deleted", `Room ${room.number} was deleted`, room.number);
  res.json({ deleted: true });
}));

router.post("/rooms/:number/maintenance", allow("Admin"), handle(async (req, res) => {
  const { on, note } = req.body || {};
  const room = await findRoom(req.params.number);
  if (on) {
    if (room.status === "occupied") fail(`Room ${room.number} has a guest checked in.`);
    const upcoming = await Reservation.countDocuments({
      roomNumber: room.number,
      status: { $in: ACTIVE },
      checkOut: { $gte: L.today() },
    });
    if (upcoming) fail(`Room ${room.number} has ${upcoming} upcoming booking(s). Cancel or move them first.`);
    const problem = L.lengthProblem(note, 5, 120, "The maintenance note");
    if (problem) fail(problem);
    room.status = "maintenance";
    room.maintenanceNote = String(note).trim();
    await L.logEvent(req.user, "room.maintenance", `Room ${room.number} set to under maintenance: ${room.maintenanceNote}`, room.number);
  } else {
    room.status = "available";
    room.maintenanceNote = "";
    await L.logEvent(req.user, "room.maintenance", `Room ${room.number} returned to service`, room.number);
  }
  await room.save();
  res.json(room);
}));

// Housekeeping: a cleaned room becomes available again
router.post("/rooms/:number/clean", allow("Staff"), handle(async (req, res) => {
  const room = await findRoom(req.params.number);
  if (room.status !== "cleaning") fail(`Room ${room.number} is not waiting to be cleaned.`);
  room.status = "available";
  await room.save();
  await L.logEvent(req.user, "room.cleaned", `Room ${room.number} was cleaned and is available again`, room.number);
  res.json(room);
}));

// ====================================================================
// RESERVATIONS
// ====================================================================
router.get("/reservations", allow("Admin", "Front Desk", "Guest"), handle(async (req, res) => {
  const p = req.query;
  const filter = { archived: p.archived === "true" };
  if (req.user.role === "Guest") filter.email = norm(req.user.email);
  if (p.status) filter.status = p.status;
  if (p.from || p.to) {
    filter.checkIn = {};
    if (p.from) filter.checkIn.$gte = p.from;
    if (p.to) filter.checkIn.$lte = p.to;
  }
  if (p.roomType) filter.roomNumber = { $in: await Room.distinct("number", { type: p.roomType }) };
  if (p.search) {
    const re = L.searchRe(p.search);
    filter.$or = [{ code: re }, { guest: re }, { email: re }];
    if (/^\d+$/.test(String(p.search).trim())) filter.$or.push({ roomNumber: Number(p.search) });
  }
  const { items, total } = await L.pageQuery(Reservation, filter, { createdAt: -1 }, p);
  res.json({ items: await withRoomType(items), total });
}));

router.post("/reservations", allow("Guest", "Front Desk"), handle(async (req, res) => {
  const user = req.user;
  const data = req.body || {};
  const room = await findRoom(data.roomNumber);
  const isGuest = user.role === "Guest";

  // A guest always books as themselves
  const guest = isGuest ? user.name : String(data.guest || "").trim();
  const email = isGuest ? norm(user.email) : norm(data.email);
  const phone = String(data.phone || (isGuest ? user.phone : "") || "").trim();
  const companions = Array.isArray(data.companions) ? data.companions : [];
  const { checkIn, checkOut } = data;
  const payment = data.payment || {};

  const problem =
    L.nameProblem(guest, "guest name") ||
    (!L.isValidEmail(email) && "Enter a valid email address.") ||
    L.phoneProblem(phone);
  if (problem) fail(problem);

  if (!checkIn || !checkOut || checkOut <= checkIn) fail("Check-out must be after check-in.");
  if (checkIn < L.today()) fail("Check-in cannot be in the past.");
  const nights = L.nightsBetween(checkIn, checkOut);
  if (nights > 30) fail("Stays are limited to 30 nights.");

  companions.forEach((c, i) => {
    const p = L.nameProblem(c && c.name, `name of guest ${i + 2}`);
    if (p) fail(`Guest ${i + 2}: ${p}`);
    if (!["Adult", "Child"].includes(c.type)) fail(`Guest ${i + 2}: choose adult or child.`);
  });
  const occupants = [
    { name: guest, type: "Adult" },
    ...companions.map((c) => ({ name: c.name.trim(), type: c.type })),
  ];
  if (occupants.length > room.capacity) fail(`Room ${room.number} sleeps up to ${room.capacity} guests.`);

  if (room.status === "maintenance") fail("This room is under maintenance.", 409);
  if ((await bookedNumbers(checkIn, checkOut)).has(room.number))
    fail("This room is already booked for those dates.", 409);

  // Fake-booking controls
  const mine = await Reservation.find({ email, status: { $in: ACTIVE } });
  if (mine.filter((r) => r.status === "confirmed").length >= L.MAX_ACTIVE_BOOKINGS)
    fail(`A guest can hold up to ${L.MAX_ACTIVE_BOOKINGS} upcoming bookings at a time.`);
  if (mine.some((r) => checkIn < r.checkOut && checkOut > r.checkIn))
    fail("This guest already has a booking for those dates.");

  const methods = isGuest ? ["GCash", "Card"] : ["GCash", "Card", "Cash"];
  if (!methods.includes(payment.method)) fail("Choose how the downpayment will be paid.");
  if (payment.method !== "Cash") {
    const p = L.referenceProblem(payment.reference);
    if (p) fail(p);
  }
  if (data.acceptedTerms !== true) fail("Accept the non-refundable downpayment terms to continue.");

  const total = nights * room.price;
  const downpayment = Math.round(total * L.DOWNPAYMENT_RATE);
  const reservation = await Reservation.create({
    code: await L.nextCode(Reservation, "RSV", 0, 1000),
    guest,
    email,
    phone,
    roomNumber: room.number,
    checkIn,
    checkOut,
    occupants,
    guests: occupants.length,
    adults: occupants.filter((o) => o.type === "Adult").length,
    children: occupants.filter((o) => o.type === "Child").length,
    status: "confirmed",
    total,
    downpayment,
    balance: total - downpayment,
    payment: {
      method: payment.method,
      reference: payment.method === "Cash" ? "" : String(payment.reference).trim().toUpperCase(),
      amount: downpayment,
    },
    createdAt: new Date(),
    createdBy: user.name,
  });
  await L.logEvent(user, "booking.created", `${guest} booked room ${room.number} (${checkIn} to ${checkOut})`, reservation.code);
  res.status(201).json(await withRoomType(reservation));
}));

// The downpayment is non-refundable
router.post("/reservations/:id/cancel", allow("Guest", "Front Desk"), handle(async (req, res) => {
  const r = await findReservation(req.params.id);
  if (req.user.role === "Guest" && norm(r.email) !== norm(req.user.email))
    fail("You can only cancel your own bookings.", 403);
  if (r.status !== "confirmed") fail(`A ${r.status} booking cannot be cancelled.`);
  r.status = "cancelled";
  r.cancelledAt = new Date();
  r.forfeited = r.downpayment;
  await r.save();
  await L.logEvent(req.user, "booking.cancelled", `${r.guest} cancelled room ${r.roomNumber}; downpayment forfeited`, r.code);
  res.json(await withRoomType(r));
}));

router.post("/reservations/:id/check-in", allow("Front Desk"), handle(async (req, res) => {
  const r = await findReservation(req.params.id);
  if (r.status !== "confirmed") fail(`A ${r.status} booking cannot be checked in.`);
  if (r.checkIn > L.today())
    fail(`${r.guest} arrives on ${L.formatDate(r.checkIn)}. Check-in opens on the arrival date.`);
  if (r.checkOut <= L.today()) fail("This booking has already ended.");
  const room = await findRoom(r.roomNumber);
  if (room.status !== "available")
    fail(`Room ${room.number} is ${room.status === "maintenance" ? "under maintenance" : room.status}, so it is not ready for check-in.`);
  r.status = "checked-in";
  r.checkedInAt = new Date();
  room.status = "occupied";
  await Promise.all([r.save(), room.save()]);
  await L.logEvent(req.user, "stay.checked-in", `${r.guest} checked in to room ${room.number}`, r.code);
  res.json(await withRoomType(r));
}));

// Checking out sends the room to housekeeping
router.post("/reservations/:id/check-out", allow("Front Desk"), handle(async (req, res) => {
  const r = await findReservation(req.params.id);
  if (r.status !== "checked-in") fail(`A ${r.status} booking cannot be checked out.`);
  const room = await findRoom(r.roomNumber);
  r.status = "checked-out";
  r.checkedOutAt = new Date();
  room.status = "cleaning";
  await Promise.all([r.save(), room.save()]);
  await L.logEvent(req.user, "stay.checked-out", `${r.guest} checked out of room ${room.number}`, r.code);
  res.json(await withRoomType(r));
}));

router.post("/reservations/:id/archive", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const r = await findReservation(req.params.id);
  if (r.status !== "checked-out" && r.status !== "cancelled")
    fail("Only completed or cancelled bookings can be archived.");
  r.archived = true;
  r.archivedAt = new Date();
  await r.save();
  await L.logEvent(req.user, "archive.archived", `Booking ${r.code} (${r.guest}) was archived`, r.code);
  res.json(await withRoomType(r));
}));

router.post("/reservations/:id/restore", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const r = await findReservation(req.params.id);
  r.archived = false;
  r.archivedAt = null;
  await r.save();
  await L.logEvent(req.user, "archive.restored", `Booking ${r.code} (${r.guest}) was restored from the archive`, r.code);
  res.json(await withRoomType(r));
}));

// ====================================================================
// FRONT DESK VIEWS
// ====================================================================
router.get("/dashboard", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const t = L.today();
  const [rooms, arrivalsToday, arrivalsWeek, departuresToday] = await Promise.all([
    Room.find().select("status"),
    Reservation.countDocuments({ status: "confirmed", checkIn: t }),
    Reservation.countDocuments({ status: "confirmed", checkIn: { $gte: t, $lte: L.addDays(7) } }),
    Reservation.countDocuments({ status: "checked-in", checkOut: { $lte: t } }),
  ]);
  const count = (s) => rooms.filter((r) => r.status === s).length;
  const inService = rooms.length - count("maintenance");
  res.json({
    totalRooms: rooms.length,
    occupied: count("occupied"),
    available: count("available"),
    cleaning: count("cleaning"),
    maintenance: count("maintenance"),
    occupancy: inService ? Math.round((count("occupied") / inService) * 100) : 0,
    arrivalsToday,
    arrivalsWeek,
    departuresToday,
  });
}));

// Today's arrivals, upcoming arrivals for the next 7 days, and any late arrivals
router.get("/arrivals", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const filter = { status: "confirmed", archived: false, checkIn: { $lte: L.addDays(7) } };
  const { items, total } = await L.pageQuery(Reservation, filter, { checkIn: 1, createdAt: -1 }, req.query);
  res.json({ items: await withRoomType(items), total });
}));

router.get("/departures", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const filter = { status: "checked-in", checkOut: { $lte: L.today() } };
  const { items, total } = await L.pageQuery(Reservation, filter, { checkOut: 1 }, req.query);
  res.json({ items: await withRoomType(items), total });
}));

router.get("/guests", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const p = req.query;
  const all = await Reservation.find();
  const map = new Map();
  all.forEach((r) => {
    const key = norm(r.email);
    if (!map.has(key)) map.set(key, { email: r.email, stays: [] });
    map.get(key).stays.push(r);
  });
  let guests = [...map.values()].map((g) => {
    const stays = [...g.stays].sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    const counted = stays.filter((s) => s.status === "checked-in" || s.status === "checked-out");
    let state = "past";
    if (stays.some((s) => s.status === "checked-in")) state = "in-house";
    else if (stays.some((s) => s.status === "confirmed")) state = "upcoming";
    return {
      email: g.email,
      name: stays[0].guest,
      phone: stays[0].phone,
      stayCount: counted.length,
      totalSpent: counted.reduce((sum, s) => sum + s.total, 0),
      bookingCount: stays.length,
      state,
    };
  });
  if (p.status) guests = guests.filter((g) => g.state === p.status);
  if (p.search) guests = guests.filter((g) => L.matches(`${g.name} ${g.email} ${g.phone}`, p.search));
  guests.sort((a, b) => a.name.localeCompare(b.name));
  res.json(L.paginate(guests, p));
}));

router.get("/guests/history", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const filter = { email: norm(req.query.email) };
  const { items, total } = await L.pageQuery(Reservation, filter, { checkIn: -1 }, req.query);
  res.json({ items: await withRoomType(items), total });
}));

// ====================================================================
// ANALYTICS AND MONITORING
// ====================================================================
router.get("/reports", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) fail("Choose a start and end date.");
  if (to < from) fail("The end date must be on or after the start date.");
  const days = L.nightsBetween(from, to) + 1;
  if (days > 366) fail("Choose a range of one year or less.");

  const [rooms, all] = await Promise.all([Room.find().sort({ number: 1 }), Reservation.find()]);
  const inRange = (v) => {
    if (!v) return false;
    const d = L.dateOf(v);
    return d >= from && d <= to;
  };
  const endExclusive = L.addDays(1, to);
  const typeOf = (r) => (rooms.find((x) => x.number === r.roomNumber) || {}).type || "Removed room";

  const created = all.filter((r) => inRange(r.createdAt));
  const checkedIn = all.filter((r) => inRange(r.checkedInAt));
  const checkedOut = all.filter((r) => inRange(r.checkedOutAt));
  const cancelled = all.filter((r) => inRange(r.cancelledAt));
  const stayed = all.filter((r) => r.status === "checked-in" || r.status === "checked-out");
  const sum = (list, key) => list.reduce((s, r) => s + (r[key] || 0), 0);

  const occupiedNights = stayed.reduce((s, r) => s + L.nightsOverlap(r.checkIn, r.checkOut, from, endExclusive), 0);
  const capacityNights = rooms.length * days;

  const byType = {};
  rooms.forEach((r) => {
    byType[r.type] = byType[r.type] || { type: r.type, bookings: 0, nights: 0, revenue: 0 };
  });
  const slot = (r) => {
    const t = typeOf(r);
    byType[t] = byType[t] || { type: t, bookings: 0, nights: 0, revenue: 0 };
    return byType[t];
  };
  created.forEach((r) => { slot(r).bookings += 1; });
  stayed.forEach((r) => { slot(r).nights += L.nightsOverlap(r.checkIn, r.checkOut, from, endExclusive); });
  checkedOut.forEach((r) => { slot(r).revenue += r.total; });

  let daily = null;
  if (days <= 62) {
    daily = [];
    for (let i = 0; i < days; i += 1) {
      const d = L.addDays(i, from);
      daily.push({
        date: d,
        bookings: created.filter((r) => L.dateOf(r.createdAt) === d).length,
        checkIns: checkedIn.filter((r) => L.dateOf(r.checkedInAt) === d).length,
      });
    }
  }

  res.json({
    from,
    to,
    days,
    bookings: created.length,
    checkIns: checkedIn.length,
    checkOuts: checkedOut.length,
    cancellations: cancelled.length,
    downpaymentsCollected: sum(created, "downpayment"),
    forfeited: sum(cancelled, "forfeited"),
    stayRevenue: sum(checkedOut, "total"),
    occupancy: capacityNights ? Math.round((occupiedNights / capacityNights) * 100) : 0,
    byType: Object.values(byType),
    daily,
  });
}));

router.get("/events", allow("Admin", "Front Desk"), handle(async (req, res) => {
  const p = req.query;
  const filter = {};
  if (p.from || p.to) {
    filter.at = {};
    if (p.from) filter.at.$gte = new Date(`${p.from}T00:00:00`);
    if (p.to) filter.at.$lte = new Date(`${p.to}T23:59:59.999`);
  }
  if (p.type) filter.type = new RegExp(`^${L.escapeRe(p.type)}\\.`);
  if (p.search) {
    const re = L.searchRe(p.search);
    filter.$or = [{ summary: re }, { actor: re }, { ref: re }];
  }
  res.json(await L.pageQuery(Event, filter, { at: -1 }, p));
}));

module.exports = { router, publicRouter };
