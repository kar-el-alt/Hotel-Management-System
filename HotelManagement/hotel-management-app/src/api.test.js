import { api } from './services/api';
import { addDays } from './utils/format';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    'hotel-session',
    JSON.stringify({
      id: 'USR-002',
      name: 'Ana Villanueva',
      email: 'frontdesk@heritage.test',
      role: 'Front Desk',
      token: 'mock-token',
    })
  );
});

test('provides seeded inventory and paginated reservations for frontend development', async () => {
  const rooms = await api.listRooms({ page: 1, pageSize: 10 });
  const reservations = await api.listReservations({ page: 1, pageSize: 10 });

  expect(rooms).toMatchObject({ total: 20 });
  expect(rooms.items).toHaveLength(10);
  expect(reservations.total).toBeGreaterThan(0);
  expect(reservations.items).toHaveLength(10);
});

test('validates booking terms and creates a reservation through the frontend API', async () => {
  const booking = {
    guest: 'Test Guest',
    email: 'test@example.com',
    phone: '0917 555 0000',
    roomNumber: 205,
    checkIn: addDays(40),
    checkOut: addDays(41),
    companions: [],
    payment: { method: 'Cash' },
    acceptedTerms: false,
  };

  await expect(api.createReservation(booking)).rejects.toThrow(
    'Accept the non-refundable downpayment terms to continue.'
  );

  const reservation = await api.createReservation({ ...booking, acceptedTerms: true });
  expect(reservation).toMatchObject({
    guest: booking.guest,
    roomNumber: booking.roomNumber,
    status: 'confirmed',
    guests: 1,
  });
});
