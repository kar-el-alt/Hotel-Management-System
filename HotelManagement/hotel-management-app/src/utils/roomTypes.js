// Room categories follow Heritage Hotel Manila's public listing: Superior, Deluxe, Club,
// Junior Suite and Executive Suite. "Family Room" is added here for larger groups.
// Rates and guest capacities are placeholders for the demo: edit them in Room management.
const BASE = ['Air conditioning', 'Free Wi-Fi', 'In-room safe', 'Desk', 'Iron and ironing board', 'Bathrobes'];
const CLUB = 'Club Lounge access';

export const ROOM_TYPES = {
  Superior: {
    price: 4800,
    capacity: 3,
    description: 'A comfortable air-conditioned room with a desk and free Wi-Fi.',
    amenities: BASE,
    image: '/images/rooms/standard-classic.png',
  },
  Deluxe: {
    price: 5900,
    capacity: 3,
    description: 'A larger room with more space to work and relax, with free Wi-Fi.',
    amenities: BASE,
    image: '/images/rooms/premium-deluxe-classic.png',
  },
  Club: {
    price: 7200,
    capacity: 3,
    description: 'A club-floor room that includes access to the Club Lounge.',
    amenities: [...BASE, CLUB],
    image: '/images/rooms/premium-contemporary.png',
  },
  'Family Room': {
    price: 8500,
    capacity: 5,
    description: 'Extra space and beds for families travelling with children.',
    amenities: [...BASE, 'Rollaway beds'],
    image: '/images/rooms/premium-twin.png',
  },
  'Junior Suite': {
    price: 9800,
    capacity: 4,
    description: 'A suite with more space than a standard room, with club access.',
    amenities: [...BASE, CLUB],
    image: '/images/rooms/standard-suite.png',
  },
  'Executive Suite': {
    price: 12500,
    capacity: 4,
    description: 'The top suite category, with a king bed, one bedroom, and club access.',
    amenities: [...BASE, CLUB, 'Rollaway beds'],
    image: '/images/rooms/premium-deluxe-suite.png',
  },
};

export const ROOM_TYPE_NAMES = Object.keys(ROOM_TYPES);
