import { seedDb } from './seed';
import { readSession } from './session';
import {
  addDays,
  today,
  dateOf,
  nightsBetween,
  formatDate,
  DOWNPAYMENT_RATE,
  MAX_ACTIVE_BOOKINGS,
} from '../utils/format';
import {
  isValidEmail,
  passwordProblem,
  nameProblem,
  phoneProblem,
  referenceProblem,
  lengthProblem,
} from '../utils/validation';
import { CREATABLE_ROLES } from '../utils/permissions';
import { ROOM_TYPE_NAMES } from '../utils/roomTypes';

// ------------------------------------------------------------------
// A stand-in for the real server. Data lives in the browser's localStorage.
// Every rule below must also be enforced by the real backend.
// ------------------------------------------------------------------
const DB_KEY = 'heritage-mock-db-v1';

const readDb = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fall through to a fresh database
  }
  return null;
};

const writeDb = (db) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    // storage full or blocked
  }
};

const getDb = () => {
  let db = readDb();
  if (!db) {
    db = seedDb();
    writeDb(db);
  }
  return db;
};

// Runs a handler after a short delay and turns thrown errors into rejected promises
const run = (fn) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      }
    }, 120);
  });

const fail = (message) => {
  throw new Error(message);
};

const need = (...roles) => {
  const user = readSession();
  if (!user) fail('Please sign in first.');
  if (!roles.includes(user.role)) fail('You do not have permission to do that.');
  return user;
};

const norm = (email) => String(email || '').trim().toLowerCase();
const matches = (text, q) => !q || text.toLowerCase().includes(String(q).trim().toLowerCase());
const publicUser = ({ password, ...rest }) => rest;
const paginate = (list, { page = 1, pageSize = 10 } = {}) => ({
  items: list.slice((page - 1) * pageSize, page * pageSize),
  total: list.length,
});

const log = (db, type, summary, ref = '') => {
  const actor = readSession();
  db.events.unshift({
    id: `EVT-${String(db.events.length + 1).padStart(4, '0')}`,
    at: new Date().toISOString(),
    type,
    actor: actor ? actor.name : 'System',
    summary,
    ref,
  });
};

const findRoom = (db, number) => {
  const room = db.rooms.find((r) => r.number === Number(number));
  if (!room) fail('Room not found.');
  return room;
};

const findReservation = (db, id) => {
  const r = db.reservations.find((x) => x.id === id);
  if (!r) fail('Reservation not found.');
  return r;
};

const withRoomType = (db, r) => {
  const room = db.rooms.find((x) => x.number === r.roomNumber);
  return { ...r, roomType: room ? room.type : 'Removed room' };
};

const isActive = (r) => r.status === 'confirmed' || r.status === 'checked-in';

const bookedFor = (db, roomNumber, checkIn, checkOut, ignoreId) =>
  db.reservations.some(
    (r) =>
      r.roomNumber === roomNumber &&
      r.id !== ignoreId &&
      isActive(r) &&
      checkIn < r.checkOut &&
      checkOut > r.checkIn
  );

const availability = (db, room, { checkIn, checkOut, adults = 1, children = 0 } = {}) => {
  if (room.status === 'maintenance') return { available: false, reason: 'Under maintenance' };
  if (Number(adults) + Number(children) > room.capacity)
    return { available: false, reason: `Sleeps up to ${room.capacity}` };
  if (!checkIn || !checkOut) return { available: true, reason: '' };
  if (checkOut <= checkIn) return { available: false, reason: 'Choose valid dates' };
  if (bookedFor(db, room.number, checkIn, checkOut))
    return { available: false, reason: 'Booked for these dates' };
  return { available: true, reason: '' };
};

const nextUserId = (users) =>
  `USR-${String(users.reduce((max, u) => Math.max(max, Number(u.id.split('-')[1])), 0) + 1).padStart(2, '0')}`;

const nightsOverlap = (aStart, aEnd, bStart, bEnd) => {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  return end > start ? nightsBetween(start, end) : 0;
};

export const mockApi = {
  // ================= Accounts =================
  login: (email, password) =>
    run(() => {
      const user = getDb().users.find((u) => u.email === norm(email));
      if (!user || user.password !== password) fail('Incorrect email or password.');
      if (!user.active) fail('This account is deactivated. Contact the administrator.');
      return { ...publicUser(user), token: 'mock-token' };
    }),

  register: (data) =>
    run(() => {
      const db = getDb();
      const email = norm(data.email);
      const problem =
        nameProblem(data.name) ||
        (!isValidEmail(email) && 'Enter a valid email address.') ||
        phoneProblem(data.phone) ||
        passwordProblem(data.password);
      if (problem) fail(problem);
      if (db.users.some((u) => u.email === email)) fail('An account with this email already exists.');

      const user = {
        id: nextUserId(db.users),
        name: String(data.name).trim(),
        email,
        phone: String(data.phone).trim(),
        role: 'Guest', // self-registration always creates a guest
        password: data.password,
        createdAt: today(),
        active: true,
        deactivationReason: '',
      };
      db.users.push(user);
      writeDb(db);
      return publicUser(user);
    }),

  updateProfile: (fields) =>
    run(() => {
      const session = need('Admin', 'Front Desk', 'Staff', 'Guest');
      const db = getDb();
      const user = db.users.find((u) => u.email === norm(session.email));
      if (!user) fail('Account not found.');
      const problem = nameProblem(fields.name) || phoneProblem(fields.phone);
      if (problem) fail(problem);
      user.name = String(fields.name).trim();
      user.phone = String(fields.phone).trim();
      writeDb(db);
      return publicUser(user);
    }),

  changePassword: (currentPassword, newPassword) =>
    run(() => {
      const session = need('Admin', 'Front Desk', 'Staff', 'Guest');
      const db = getDb();
      const user = db.users.find((u) => u.email === norm(session.email));
      if (!user) fail('Account not found.');
      if (user.password !== currentPassword) fail('Your current password is incorrect.');
      const problem = passwordProblem(newPassword);
      if (problem) fail(problem);
      if (newPassword === currentPassword) fail('Choose a password different from your current one.');
      user.password = newPassword;
      writeDb(db);
      return { changed: true };
    }),

  // Always answers the same way so nobody can learn which emails are registered.
  // Demo only: the code is returned because this project has no email service.
  requestPasswordReset: (email) =>
    run(() => {
      if (!isValidEmail(email)) fail('Enter a valid email address.');
      const db = getDb();
      const user = db.users.find((u) => u.email === norm(email));
      if (!user) return { sent: true };
      const code = String(Math.floor(100000 + Math.random() * 900000));
      db.resets[user.email] = { code, expires: Date.now() + 10 * 60 * 1000 };
      writeDb(db);
      return { sent: true, demoCode: code };
    }),

  resetPassword: (email, code, password) =>
    run(() => {
      const db = getDb();
      const key = norm(email);
      const entry = db.resets[key];
      if (!entry || entry.code !== String(code)) fail('That code is not valid. Request a new one.');
      if (Date.now() > entry.expires) fail('That code has expired. Request a new one.');
      const problem = passwordProblem(password);
      if (problem) fail(problem);
      const user = db.users.find((u) => u.email === key);
      if (!user) fail('Account not found.');
      user.password = password;
      delete db.resets[key];
      writeDb(db);
      return { reset: true };
    }),

  // ================= Users (admin: view, add staff, deactivate) =================
  listUsers: (p = {}) =>
    run(() => {
      need('Admin');
      let list = getDb().users.map(publicUser);
      if (p.role && p.role !== 'All') list = list.filter((u) => u.role === p.role);
      if (p.status === 'Active') list = list.filter((u) => u.active);
      if (p.status === 'Deactivated') list = list.filter((u) => !u.active);
      if (p.search) list = list.filter((u) => matches(`${u.id} ${u.name} ${u.email} ${u.phone}`, p.search));
      return paginate(list, p);
    }),

  createUser: (data) =>
    run(() => {
      const admin = need('Admin');
      const db = getDb();
      const email = norm(data.email);
      const problem =
        nameProblem(data.name) ||
        (!isValidEmail(email) && 'Enter a valid email address.') ||
        phoneProblem(data.phone) ||
        (!CREATABLE_ROLES.includes(data.role) && 'Choose Front Desk or Staff.') ||
        passwordProblem(data.password);
      if (problem) fail(problem);
      if (db.users.some((u) => u.email === email)) fail('An account with this email already exists.');
      const user = {
        id: nextUserId(db.users),
        name: String(data.name).trim(),
        email,
        phone: String(data.phone).trim(),
        role: data.role, // fixed for the life of the account
        password: data.password,
        createdAt: today(),
        active: true,
        deactivationReason: '',
      };
      db.users.push(user);
      log(db, 'user.created', `${admin.name} created a ${user.role} account for ${user.name}`, user.id);
      writeDb(db);
      return publicUser(user);
    }),

  deactivateUser: (id, reason) =>
    run(() => {
      const admin = need('Admin');
      const db = getDb();
      const user = db.users.find((u) => u.id === id);
      if (!user) fail('User not found.');
      if (user.email === norm(admin.email)) fail("You can't deactivate your own account.");
      if (user.role === 'Admin') fail('The admin account cannot be deactivated.');
      const problem = lengthProblem(reason, 5, 200, 'The reason');
      if (problem) fail(problem);
      user.active = false;
      user.deactivationReason = String(reason).trim();
      log(db, 'user.deactivated', `${user.name} was deactivated: ${user.deactivationReason}`, user.id);
      writeDb(db);
      return publicUser(user);
    }),

  reactivateUser: (id) =>
    run(() => {
      need('Admin');
      const db = getDb();
      const user = db.users.find((u) => u.id === id);
      if (!user) fail('User not found.');
      user.active = true;
      user.deactivationReason = '';
      log(db, 'user.reactivated', `${user.name} was reactivated`, user.id);
      writeDb(db);
      return publicUser(user);
    }),

  // ================= Rooms =================
  // Public: the home page lists rooms and checks availability without signing in
  listRooms: (p = {}) =>
    run(() => {
      const db = getDb();
      let rooms = db.rooms.slice().sort((a, b) => a.number - b.number);
      if (p.type && p.type !== 'All') rooms = rooms.filter((r) => r.type === p.type);
      if (p.status && p.status !== 'All') rooms = rooms.filter((r) => r.status === p.status);
      if (p.floor) rooms = rooms.filter((r) => r.floor === Number(p.floor));
      if (p.search) rooms = rooms.filter((r) => matches(`${r.number} ${r.type} ${r.description}`, p.search));
      let list = rooms.map((r) => ({ ...r, availability: availability(db, r, p) }));
      if (p.onlyAvailable) list = list.filter((r) => r.availability.available);
      return paginate(list, p);
    }),

  getFloors: () =>
    run(() => [...new Set(getDb().rooms.map((r) => r.floor))].sort((a, b) => a - b)),

  checkRoomAvailability: (number, p = {}) =>
    run(() => {
      const db = getDb();
      return availability(db, findRoom(db, number), p);
    }),

  createRoom: (data) =>
    run(() => {
      need('Admin');
      const db = getDb();
      const number = Number(data.number);
      if (!Number.isInteger(number) || number < 1 || number > 9999) fail('Enter a room number from 1 to 9999.');
      if (db.rooms.some((r) => r.number === number)) fail(`Room ${number} already exists.`);
      validateRoomFields(data);
      const room = {
        number,
        type: data.type,
        floor: Math.max(1, Math.floor(number / 100)),
        price: Number(data.price),
        capacity: Number(data.capacity),
        description: String(data.description).trim(),
        amenities: data.amenities.map((a) => a.trim()).filter(Boolean),
        status: 'available',
        maintenanceNote: '',
      };
      db.rooms.push(room);
      log(db, 'room.created', `Room ${number} (${room.type}) was added`, String(number));
      writeDb(db);
      return room;
    }),

  updateRoom: (number, data) =>
    run(() => {
      need('Admin');
      const db = getDb();
      const room = findRoom(db, number);
      validateRoomFields(data);
      const tooMany = db.reservations.find(
        (r) => r.roomNumber === room.number && isActive(r) && r.guests > Number(data.capacity)
      );
      if (tooMany)
        fail(`Booking ${tooMany.id} has ${tooMany.guests} guests, which is more than ${data.capacity}.`);
      room.type = data.type;
      room.price = Number(data.price);
      room.capacity = Number(data.capacity);
      room.description = String(data.description).trim();
      room.amenities = data.amenities.map((a) => a.trim()).filter(Boolean);
      log(db, 'room.updated', `Room ${room.number} details were updated`, String(room.number));
      writeDb(db);
      return room;
    }),

  deleteRoom: (number) =>
    run(() => {
      need('Admin');
      const db = getDb();
      const room = findRoom(db, number);
      if (room.status === 'occupied') fail(`Room ${room.number} has a guest checked in.`);
      const active = db.reservations.filter((r) => r.roomNumber === room.number && isActive(r));
      if (active.length)
        fail(`Room ${room.number} has ${active.length} active booking(s). Cancel or complete them first.`);
      db.rooms = db.rooms.filter((r) => r.number !== room.number);
      log(db, 'room.deleted', `Room ${room.number} was deleted`, String(room.number));
      writeDb(db);
      return { deleted: true };
    }),

  setMaintenance: (number, on, note) =>
    run(() => {
      need('Admin');
      const db = getDb();
      const room = findRoom(db, number);
      if (on) {
        if (room.status === 'occupied') fail(`Room ${room.number} has a guest checked in.`);
        const upcoming = db.reservations.filter(
          (r) => r.roomNumber === room.number && isActive(r) && r.checkOut >= today()
        );
        if (upcoming.length)
          fail(`Room ${room.number} has ${upcoming.length} upcoming booking(s). Cancel or move them first.`);
        const problem = lengthProblem(note, 5, 120, 'The maintenance note');
        if (problem) fail(problem);
        room.status = 'maintenance';
        room.maintenanceNote = String(note).trim();
        log(db, 'room.maintenance', `Room ${room.number} set to under maintenance: ${room.maintenanceNote}`, String(room.number));
      } else {
        room.status = 'available';
        room.maintenanceNote = '';
        log(db, 'room.maintenance', `Room ${room.number} returned to service`, String(room.number));
      }
      writeDb(db);
      return room;
    }),

  // Housekeeping: a cleaned room becomes available again
  markRoomClean: (number) =>
    run(() => {
      need('Staff');
      const db = getDb();
      const room = findRoom(db, number);
      if (room.status !== 'cleaning') fail(`Room ${room.number} is not waiting to be cleaned.`);
      room.status = 'available';
      log(db, 'room.cleaned', `Room ${room.number} was cleaned and is available again`, String(room.number));
      writeDb(db);
      return room;
    }),

  // ================= Reservations =================
  listReservations: (p = {}) =>
    run(() => {
      const user = need('Admin', 'Front Desk', 'Guest');
      const db = getDb();
      let list = db.reservations.slice();
      if (user.role === 'Guest') list = list.filter((r) => norm(r.email) === norm(user.email));
      list = list.filter((r) => Boolean(r.archived) === Boolean(p.archived));
      if (p.status && p.status !== 'all') list = list.filter((r) => r.status === p.status);
      if (p.from) list = list.filter((r) => r.checkIn >= p.from);
      if (p.to) list = list.filter((r) => r.checkIn <= p.to);
      if (p.roomType && p.roomType !== 'All') {
        const numbers = db.rooms.filter((x) => x.type === p.roomType).map((x) => x.number);
        list = list.filter((r) => numbers.includes(r.roomNumber));
      }
      if (p.search) list = list.filter((r) => matches(`${r.id} ${r.guest} ${r.email} ${r.roomNumber}`, p.search));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const result = paginate(list, p);
      return { ...result, items: result.items.map((r) => withRoomType(db, r)) };
    }),

  createReservation: (data) =>
    run(() => {
      const user = need('Guest', 'Front Desk');
      const db = getDb();
      const room = findRoom(db, data.roomNumber);
      const isGuest = user.role === 'Guest';

      // A guest always books as themselves
      const guest = isGuest ? user.name : String(data.guest || '').trim();
      const email = isGuest ? norm(user.email) : norm(data.email);
      const phone = String(data.phone || (isGuest ? user.phone : '') || '').trim();
      const companions = Array.isArray(data.companions) ? data.companions : [];
      const { checkIn, checkOut } = data;
      const payment = data.payment || {};

      const problem =
        nameProblem(guest, 'guest name') ||
        (!isValidEmail(email) && 'Enter a valid email address.') ||
        phoneProblem(phone);
      if (problem) fail(problem);

      if (!checkIn || !checkOut || checkOut <= checkIn) fail('Check-out must be after check-in.');
      if (checkIn < today()) fail('Check-in cannot be in the past.');
      const nights = nightsBetween(checkIn, checkOut);
      if (nights > 30) fail('Stays are limited to 30 nights.');

      companions.forEach((c, i) => {
        const p = nameProblem(c.name, `name of guest ${i + 2}`);
        if (p) fail(`Guest ${i + 2}: ${p}`);
        if (!['Adult', 'Child'].includes(c.type)) fail(`Guest ${i + 2}: choose adult or child.`);
      });
      const occupants = [
        { name: guest, type: 'Adult' },
        ...companions.map((c) => ({ name: c.name.trim(), type: c.type })),
      ];
      if (occupants.length > room.capacity)
        fail(`Room ${room.number} sleeps up to ${room.capacity} guests.`);

      if (room.status === 'maintenance') fail('This room is under maintenance.');
      if (bookedFor(db, room.number, checkIn, checkOut)) fail('This room is already booked for those dates.');

      // Fake-booking controls
      const mine = db.reservations.filter((r) => norm(r.email) === email && isActive(r));
      if (mine.filter((r) => r.status === 'confirmed').length >= MAX_ACTIVE_BOOKINGS)
        fail(`A guest can hold up to ${MAX_ACTIVE_BOOKINGS} upcoming bookings at a time.`);
      if (mine.some((r) => checkIn < r.checkOut && checkOut > r.checkIn))
        fail('This guest already has a booking for those dates.');

      const methods = isGuest ? ['GCash', 'Card'] : ['GCash', 'Card', 'Cash'];
      if (!methods.includes(payment.method)) fail('Choose how the downpayment will be paid.');
      if (payment.method !== 'Cash') {
        const p = referenceProblem(payment.reference);
        if (p) fail(p);
      }
      if (data.acceptedTerms !== true) fail('Accept the non-refundable downpayment terms to continue.');

      const total = nights * room.price;
      const downpayment = Math.round(total * DOWNPAYMENT_RATE);
      const lastId = db.reservations.reduce((max, r) => Math.max(max, Number(r.id.split('-')[1])), 1000);
      const reservation = {
        id: `RSV-${lastId + 1}`,
        guest,
        email,
        phone,
        roomNumber: room.number,
        checkIn,
        checkOut,
        occupants,
        guests: occupants.length,
        adults: occupants.filter((o) => o.type === 'Adult').length,
        children: occupants.filter((o) => o.type === 'Child').length,
        status: 'confirmed',
        total,
        downpayment,
        balance: total - downpayment,
        payment: {
          method: payment.method,
          reference: payment.method === 'Cash' ? '' : String(payment.reference).trim().toUpperCase(),
          amount: downpayment,
        },
        createdAt: new Date().toISOString(),
        createdBy: user.name,
        checkedInAt: null,
        checkedOutAt: null,
        cancelledAt: null,
        forfeited: 0,
        archived: false,
        archivedAt: null,
      };
      db.reservations.unshift(reservation);
      log(db, 'booking.created', `${guest} booked room ${room.number} (${checkIn} to ${checkOut})`, reservation.id);
      writeDb(db);
      return withRoomType(db, reservation);
    }),

  // The downpayment is non-refundable
  cancelReservation: (id) =>
    run(() => {
      const user = need('Guest', 'Front Desk');
      const db = getDb();
      const r = findReservation(db, id);
      if (user.role === 'Guest' && norm(r.email) !== norm(user.email))
        fail('You can only cancel your own bookings.');
      if (r.status !== 'confirmed') fail(`A ${r.status} booking cannot be cancelled.`);
      r.status = 'cancelled';
      r.cancelledAt = new Date().toISOString();
      r.forfeited = r.downpayment;
      log(db, 'booking.cancelled', `${r.guest} cancelled room ${r.roomNumber}; downpayment forfeited`, r.id);
      writeDb(db);
      return withRoomType(db, r);
    }),

  checkInReservation: (id) =>
    run(() => {
      need('Front Desk');
      const db = getDb();
      const r = findReservation(db, id);
      if (r.status !== 'confirmed') fail(`A ${r.status} booking cannot be checked in.`);
      if (r.checkIn > today())
        fail(`${r.guest} arrives on ${formatDate(r.checkIn)}. Check-in opens on the arrival date.`);
      if (r.checkOut <= today()) fail('This booking has already ended.');
      const room = findRoom(db, r.roomNumber);
      if (room.status !== 'available')
        fail(`Room ${room.number} is ${room.status === 'maintenance' ? 'under maintenance' : room.status}, so it is not ready for check-in.`);
      r.status = 'checked-in';
      r.checkedInAt = new Date().toISOString();
      room.status = 'occupied';
      log(db, 'stay.checked-in', `${r.guest} checked in to room ${room.number}`, r.id);
      writeDb(db);
      return withRoomType(db, r);
    }),

  // Checking out sends the room to housekeeping
  checkOutReservation: (id) =>
    run(() => {
      need('Front Desk');
      const db = getDb();
      const r = findReservation(db, id);
      if (r.status !== 'checked-in') fail(`A ${r.status} booking cannot be checked out.`);
      const room = findRoom(db, r.roomNumber);
      r.status = 'checked-out';
      r.checkedOutAt = new Date().toISOString();
      room.status = 'cleaning';
      log(db, 'stay.checked-out', `${r.guest} checked out of room ${room.number}`, r.id);
      writeDb(db);
      return withRoomType(db, r);
    }),

  archiveReservation: (id) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const r = findReservation(db, id);
      if (r.status !== 'checked-out' && r.status !== 'cancelled')
        fail('Only completed or cancelled bookings can be archived.');
      r.archived = true;
      r.archivedAt = new Date().toISOString();
      log(db, 'archive.archived', `Booking ${r.id} (${r.guest}) was archived`, r.id);
      writeDb(db);
      return withRoomType(db, r);
    }),

  restoreReservation: (id) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const r = findReservation(db, id);
      r.archived = false;
      r.archivedAt = null;
      log(db, 'archive.restored', `Booking ${r.id} (${r.guest}) was restored from the archive`, r.id);
      writeDb(db);
      return withRoomType(db, r);
    }),

  // ================= Front desk views =================
  getDashboard: () =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const count = (s) => db.rooms.filter((r) => r.status === s).length;
      const inService = db.rooms.length - count('maintenance');
      const t = today();
      return {
        totalRooms: db.rooms.length,
        occupied: count('occupied'),
        available: count('available'),
        cleaning: count('cleaning'),
        maintenance: count('maintenance'),
        occupancy: inService ? Math.round((count('occupied') / inService) * 100) : 0,
        arrivalsToday: db.reservations.filter((r) => r.status === 'confirmed' && r.checkIn === t).length,
        arrivalsWeek: db.reservations.filter(
          (r) => r.status === 'confirmed' && r.checkIn >= t && r.checkIn <= addDays(7)
        ).length,
        departuresToday: db.reservations.filter((r) => r.status === 'checked-in' && r.checkOut <= t).length,
      };
    }),

  // Today's arrivals, upcoming arrivals for the next 7 days, and any late arrivals
  listArrivals: (p = {}) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const list = db.reservations
        .filter((r) => r.status === 'confirmed' && !r.archived && r.checkIn <= addDays(7))
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || b.createdAt.localeCompare(a.createdAt));
      const result = paginate(list, p);
      return { ...result, items: result.items.map((r) => withRoomType(db, r)) };
    }),

  listDepartures: (p = {}) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const list = db.reservations
        .filter((r) => r.status === 'checked-in' && r.checkOut <= today())
        .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
      const result = paginate(list, p);
      return { ...result, items: result.items.map((r) => withRoomType(db, r)) };
    }),

  listGuests: (p = {}) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const map = new Map();
      db.reservations.forEach((r) => {
        const key = norm(r.email);
        if (!map.has(key)) map.set(key, { email: r.email, name: r.guest, phone: r.phone, stays: [] });
        map.get(key).stays.push(r);
      });
      let guests = [...map.values()].map((g) => {
        const stays = [...g.stays].sort((a, b) => b.checkIn.localeCompare(a.checkIn));
        const counted = stays.filter((s) => s.status === 'checked-in' || s.status === 'checked-out');
        let state = 'past';
        if (stays.some((s) => s.status === 'checked-in')) state = 'in-house';
        else if (stays.some((s) => s.status === 'confirmed')) state = 'upcoming';
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
      if (p.status && p.status !== 'all') guests = guests.filter((g) => g.state === p.status);
      if (p.search) guests = guests.filter((g) => matches(`${g.name} ${g.email} ${g.phone}`, p.search));
      guests.sort((a, b) => a.name.localeCompare(b.name));
      return paginate(guests, p);
    }),

  getGuestHistory: (email, p = {}) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      const list = db.reservations
        .filter((r) => norm(r.email) === norm(email))
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
      const result = paginate(list, { pageSize: 10, ...p });
      return { ...result, items: result.items.map((r) => withRoomType(db, r)) };
    }),

  // ================= Analytics and monitoring =================
  getReport: ({ from, to } = {}) =>
    run(() => {
      need('Admin', 'Front Desk');
      const db = getDb();
      if (!from || !to) fail('Choose a start and end date.');
      if (to < from) fail('The end date must be on or after the start date.');
      const days = nightsBetween(from, to) + 1;
      if (days > 366) fail('Choose a range of one year or less.');

      const inRange = (iso) => {
        if (!iso) return false;
        const d = dateOf(iso);
        return d >= from && d <= to;
      };
      const endExclusive = addDays(1, to);
      const roomType = (r) => (db.rooms.find((x) => x.number === r.roomNumber) || {}).type || 'Removed room';

      const created = db.reservations.filter((r) => inRange(r.createdAt));
      const checkedIn = db.reservations.filter((r) => inRange(r.checkedInAt));
      const checkedOut = db.reservations.filter((r) => inRange(r.checkedOutAt));
      const cancelled = db.reservations.filter((r) => inRange(r.cancelledAt));
      const stayed = db.reservations.filter((r) => r.status === 'checked-in' || r.status === 'checked-out');
      const sum = (list, key) => list.reduce((s, r) => s + (r[key] || 0), 0);

      const occupiedNights = stayed.reduce(
        (s, r) => s + nightsOverlap(r.checkIn, r.checkOut, from, endExclusive),
        0
      );
      const capacityNights = db.rooms.length * days;

      const byType = {};
      db.rooms.forEach((r) => {
        byType[r.type] = byType[r.type] || { type: r.type, bookings: 0, nights: 0, revenue: 0 };
      });
      const slot = (r) => {
        const t = roomType(r);
        byType[t] = byType[t] || { type: t, bookings: 0, nights: 0, revenue: 0 };
        return byType[t];
      };
      created.forEach((r) => {
        slot(r).bookings += 1;
      });
      stayed.forEach((r) => {
        slot(r).nights += nightsOverlap(r.checkIn, r.checkOut, from, endExclusive);
      });
      checkedOut.forEach((r) => {
        slot(r).revenue += r.total;
      });

      let daily = null;
      if (days <= 62) {
        daily = [];
        for (let i = 0; i < days; i += 1) {
          const d = addDays(i, from);
          daily.push({
            date: d,
            bookings: created.filter((r) => dateOf(r.createdAt) === d).length,
            checkIns: checkedIn.filter((r) => dateOf(r.checkedInAt) === d).length,
          });
        }
      }

      return {
        from,
        to,
        days,
        bookings: created.length,
        checkIns: checkedIn.length,
        checkOuts: checkedOut.length,
        cancellations: cancelled.length,
        downpaymentsCollected: sum(created, 'downpayment'),
        forfeited: sum(cancelled, 'forfeited'),
        stayRevenue: sum(checkedOut, 'total'),
        occupancy: capacityNights ? Math.round((occupiedNights / capacityNights) * 100) : 0,
        byType: Object.values(byType),
        daily,
      };
    }),

  listEvents: (p = {}) =>
    run(() => {
      need('Admin', 'Front Desk');
      let list = getDb().events.slice();
      if (p.from) list = list.filter((e) => dateOf(e.at) >= p.from);
      if (p.to) list = list.filter((e) => dateOf(e.at) <= p.to);
      if (p.type && p.type !== 'All') list = list.filter((e) => e.type.split('.')[0] === p.type);
      if (p.search) list = list.filter((e) => matches(`${e.summary} ${e.actor} ${e.ref}`, p.search));
      list.sort((a, b) => b.at.localeCompare(a.at));
      return paginate(list, p);
    }),
};

function validateRoomFields(data) {
  if (!ROOM_TYPE_NAMES.includes(data.type)) fail('Choose a room type.');
  const price = Number(data.price);
  if (!Number.isInteger(price) || price < 500 || price > 100000)
    fail('The rate must be a whole number from 500 to 100,000.');
  const capacity = Number(data.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) fail('Capacity must be from 1 to 8 guests.');
  const problem = lengthProblem(data.description, 10, 200, 'The description');
  if (problem) fail(problem);
  if (!Array.isArray(data.amenities) || data.amenities.filter((a) => a.trim()).length < 1)
    fail('List at least one amenity.');
}
