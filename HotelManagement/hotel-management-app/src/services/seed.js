import { addDays, nightsBetween, DOWNPAYMENT_RATE } from '../utils/format';
import { ROOM_TYPES } from '../utils/roomTypes';

const pad = (n) => String(n).padStart(2, '0');
// Local date + time -> ISO timestamp
const at = (date, h = 12, m = 0) => new Date(`${date}T${pad(h)}:${pad(m)}:00`).toISOString();

const LAYOUT = [
  ['Superior', [201, 202, 203, 204, 205]],
  ['Deluxe', [301, 302, 303, 304, 305]],
  ['Club', [401, 402, 403]],
  ['Family Room', [501, 502, 503]],
  ['Junior Suite', [601, 602]],
  ['Executive Suite', [701, 702]],
];

// The first five have user accounts. The rest are walk-in guests booked by the front desk.
const GUESTS = [
  ['Maria Santos', 'maria@example.com', '0917 222 0001'],
  ['Daniel Reyes', 'daniel@example.com', '0917 222 0002'],
  ['Aileen Cruz', 'aileen@example.com', '0917 222 0003'],
  ['Jorge Lim', 'jorge@example.com', '0917 222 0004'],
  ['Hana Park', 'hana@example.com', '0917 222 0005'],
  ['Carlo Dizon', 'carlo@example.com', '0917 333 0001'],
  ['Bianca Tan', 'bianca@example.com', '0917 333 0002'],
  ['Rica Flores', 'rica@example.com', '0917 333 0003'],
  ['Noel Aquino', 'noel@example.com', '0917 333 0004'],
  ['Liza Mendoza', 'liza@example.com', '0917 333 0005'],
  ['Ethan Go', 'ethan@example.com', '0917 333 0006'],
  ['Sofia Ramos', 'sofia@example.com', '0917 333 0007'],
];

const ADULT_NAMES = ['Elena', 'Marco', 'Grace', 'Paolo', 'Nina', 'Victor'];
const CHILD_NAMES = ['Leo', 'Mia', 'Zoe', 'Kai'];
const lastName = (full) => full.split(' ').slice(-1)[0];

const occupantsFor = (n, room, primary) => {
  const list = [{ name: primary, type: 'Adult' }];
  const last = lastName(primary);
  if (room.type === 'Family Room') {
    list.push({ name: `${ADULT_NAMES[n % 6]} ${last}`, type: 'Adult' });
    list.push({ name: `${CHILD_NAMES[n % 4]} ${last}`, type: 'Child' });
    list.push({ name: `${CHILD_NAMES[(n + 1) % 4]} ${last}`, type: 'Child' });
    return list;
  }
  if (n % 3 === 0) list.push({ name: `${ADULT_NAMES[n % 6]} ${last}`, type: 'Adult' });
  if (n % 4 === 0 && list.length < room.capacity)
    list.push({ name: `${CHILD_NAMES[n % 4]} ${last}`, type: 'Child' });
  return list;
};

export function seedDb() {
  // ---------- Rooms ----------
  const rooms = LAYOUT.flatMap(([type, numbers]) =>
    numbers.map((number) => ({
      number,
      type,
      floor: Math.floor(number / 100),
      price: ROOM_TYPES[type].price,
      capacity: ROOM_TYPES[type].capacity,
      description: ROOM_TYPES[type].description,
      amenities: ROOM_TYPES[type].amenities,
      status: 'available',
      maintenanceNote: '',
    }))
  );
  const roomNumbers = rooms.map((r) => r.number);
  const roomOf = (number) => rooms.find((r) => r.number === number);

  // ---------- Reservations ----------
  const reservations = [];
  const make = ({ n, g, room: roomNumber, inOff, outOff, status, createdOff }) => {
    const room = roomOf(roomNumber);
    const [guest, email, phone] = GUESTS[g];
    const hasAccount = g < 5;
    const method = hasAccount ? (n % 2 ? 'GCash' : 'Card') : 'Cash';
    const checkIn = addDays(inOff);
    const checkOut = addDays(outOff);
    const total = nightsBetween(checkIn, checkOut) * room.price;
    const downpayment = Math.round(total * DOWNPAYMENT_RATE);
    const occupants = occupantsFor(n, room, guest);
    const r = {
      id: `RSV-${1000 + n}`,
      guest,
      email,
      phone,
      roomNumber,
      checkIn,
      checkOut,
      occupants,
      guests: occupants.length,
      adults: occupants.filter((o) => o.type === 'Adult').length,
      children: occupants.filter((o) => o.type === 'Child').length,
      status,
      total,
      downpayment,
      balance: total - downpayment,
      payment: {
        method,
        reference: method === 'Cash' ? '' : `${method === 'GCash' ? 'GC' : 'CD'}${1000000000 + n * 7919}`,
        amount: downpayment,
      },
      createdAt: at(addDays(createdOff), 10, 15),
      createdBy: hasAccount ? guest : 'Ana Villanueva',
      checkedInAt: null,
      checkedOutAt: null,
      cancelledAt: null,
      forfeited: 0,
      archived: false,
      archivedAt: null,
    };
    if (status === 'checked-in' || status === 'checked-out') r.checkedInAt = at(checkIn, 14, 20);
    if (status === 'checked-out') r.checkedOutAt = at(checkOut, 6, 30);
    if (status === 'cancelled') {
      r.cancelledAt = at(addDays(createdOff + 1), 16, 0);
      r.forfeited = downpayment;
    }
    reservations.push(r);
  };

  // 22 completed stays over the last weeks
  for (let i = 0; i < 22; i += 1) {
    const inOff = -(75 - i * 3);
    make({
      n: i + 1,
      g: i % 12,
      room: roomNumbers[i % roomNumbers.length],
      inOff,
      outOff: inOff + 1 + (i % 3),
      status: 'checked-out',
      createdOff: inOff - 8,
    });
  }

  // Guests staying now
  make({ n: 23, g: 0, room: 201, inOff: -2, outOff: 1, status: 'checked-in', createdOff: -9 });
  make({ n: 24, g: 1, room: 301, inOff: -1, outOff: 2, status: 'checked-in', createdOff: -7 });
  make({ n: 25, g: 2, room: 401, inOff: -3, outOff: 0, status: 'checked-in', createdOff: -10 });
  make({ n: 26, g: 3, room: 501, inOff: -1, outOff: 3, status: 'checked-in', createdOff: -12 });
  make({ n: 27, g: 4, room: 701, inOff: -2, outOff: 1, status: 'checked-in', createdOff: -8 });
  // Left this morning, room waiting to be cleaned
  make({ n: 28, g: 5, room: 202, inOff: -2, outOff: 0, status: 'checked-out', createdOff: -6 });
  // Arriving today
  make({ n: 29, g: 6, room: 203, inOff: 0, outOff: 2, status: 'confirmed', createdOff: -3 });
  make({ n: 30, g: 10, room: 302, inOff: 0, outOff: 1, status: 'confirmed', createdOff: -2 });
  // Coming up
  make({ n: 31, g: 7, room: 204, inOff: 2, outOff: 4, status: 'confirmed', createdOff: -2 });
  make({ n: 32, g: 11, room: 303, inOff: 3, outOff: 5, status: 'confirmed', createdOff: -1 });
  make({ n: 33, g: 8, room: 402, inOff: 5, outOff: 7, status: 'confirmed', createdOff: -1 });
  make({ n: 34, g: 0, room: 601, inOff: 6, outOff: 8, status: 'confirmed', createdOff: 0 });
  make({ n: 35, g: 9, room: 502, inOff: 12, outOff: 15, status: 'confirmed', createdOff: 0 });
  make({ n: 36, g: 1, room: 702, inOff: 20, outOff: 22, status: 'confirmed', createdOff: 0 });
  // Cancelled (downpayment forfeited)
  make({ n: 37, g: 4, room: 304, inOff: 4, outOff: 6, status: 'cancelled', createdOff: -4 });
  make({ n: 38, g: 3, room: 403, inOff: 9, outOff: 11, status: 'cancelled', createdOff: -3 });

  // Room statuses that follow from the reservations
  reservations
    .filter((r) => r.status === 'checked-in')
    .forEach((r) => {
      roomOf(r.roomNumber).status = 'occupied';
    });
  roomOf(202).status = 'cleaning';
  roomOf(305).status = 'maintenance';
  roomOf(305).maintenanceNote = 'Air-conditioning repair';

  // ---------- Users (10 accounts, one admin) ----------
  const user = (n, name, email, phone, role, password, daysAgo) => ({
    id: `USR-${pad(n)}`,
    name,
    email,
    phone,
    role,
    password,
    createdAt: addDays(-daysAgo),
    active: true,
    deactivationReason: '',
  });
  const users = [
    user(1, 'Marco Dela Cruz', 'admin@heritage.test', '0917 111 0001', 'Admin', 'admin123', 120),
    user(2, 'Ana Villanueva', 'frontdesk@heritage.test', '0917 111 0002', 'Front Desk', 'frontdesk123', 90),
    user(3, 'Paolo Mercado', 'paolo@heritage.test', '0917 111 0003', 'Front Desk', 'frontdesk123', 60),
    user(4, 'Liza Navarro', 'staff@heritage.test', '0917 111 0004', 'Staff', 'staff12345', 80),
    user(5, 'Ramon Bautista', 'ramon@heritage.test', '0917 111 0005', 'Staff', 'staff12345', 50),
    ...GUESTS.slice(0, 5).map(([name, email, phone], i) =>
      user(6 + i, name, email, phone, 'Guest', 'guest12345', 45 - i * 5)
    ),
  ];

  // ---------- Activity log, built from the reservations ----------
  const events = [];
  const push = (when, type, actor, summary, ref) => events.push({ at: when, type, actor, summary, ref });
  reservations.forEach((r) => {
    push(r.createdAt, 'booking.created', r.createdBy, `${r.guest} booked room ${r.roomNumber} (${r.checkIn} to ${r.checkOut})`, r.id);
    if (r.checkedInAt) push(r.checkedInAt, 'stay.checked-in', 'Ana Villanueva', `${r.guest} checked in to room ${r.roomNumber}`, r.id);
    if (r.checkedOutAt) push(r.checkedOutAt, 'stay.checked-out', 'Ana Villanueva', `${r.guest} checked out of room ${r.roomNumber}`, r.id);
    if (r.cancelledAt) push(r.cancelledAt, 'booking.cancelled', r.createdBy, `${r.guest} cancelled room ${r.roomNumber}; downpayment forfeited`, r.id);
  });
  push(at(addDays(-3), 9, 0), 'room.maintenance', 'Marco Dela Cruz', 'Room 305 set to under maintenance: Air-conditioning repair', '305');
  events.sort((a, b) => a.at.localeCompare(b.at));
  events.forEach((e, i) => {
    e.id = `EVT-${String(i + 1).padStart(4, '0')}`;
  });
  events.reverse(); // newest first

  return { rooms, reservations, users, events, resets: {} };
}
