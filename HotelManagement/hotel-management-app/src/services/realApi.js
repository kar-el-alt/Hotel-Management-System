import { readSession } from './session';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const authHeader = () => {
  const session = readSession();
  return session && session.token ? { Authorization: `Bearer ${session.token}` } : {};
};

const qs = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'All' && v !== 'all') s.append(k, v);
  });
  const text = s.toString();
  return text ? `?${text}` : '';
};

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Try again.');
  return body;
}

const get = (path, params) => request(`${path}${qs(params)}`);
const post = (path, data = {}) => request(path, { method: 'POST', body: JSON.stringify(data) });
const patch = (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) });
const del = (path) => request(path, { method: 'DELETE' });

// Every endpoint the backend needs to provide
export const realApi = {
  // Accounts
  login: (email, password) => post('/auth/login', { email, password }),
  register: (data) => post('/auth/register', data),
  requestPasswordReset: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (email, code, password) => post('/auth/reset-password', { email, code, password }),
  updateProfile: (fields) => patch('/users/me', fields),
  changePassword: (currentPassword, newPassword) =>
    post('/auth/change-password', { currentPassword, newPassword }),

  // Users (admin: view, add staff, deactivate)
  listUsers: (p) => get('/users', p),
  createUser: (data) => post('/users', data),
  deactivateUser: (id, reason) => post(`/users/${id}/deactivate`, { reason }),
  reactivateUser: (id) => post(`/users/${id}/reactivate`),

  // Rooms (public list; admin manages)
  listRooms: (p) => get('/rooms', p),
  getFloors: () => get('/rooms/floors'),
  checkRoomAvailability: (number, p) => get(`/rooms/${number}/availability`, p),
  createRoom: (data) => post('/rooms', data),
  updateRoom: (number, data) => patch(`/rooms/${number}`, data),
  deleteRoom: (number) => del(`/rooms/${number}`),
  setMaintenance: (number, on, note) => post(`/rooms/${number}/maintenance`, { on, note }),
  markRoomClean: (number) => post(`/rooms/${number}/clean`),

  // Reservations
  listReservations: (p) => get('/reservations', p),
  createReservation: (data) => post('/reservations', data),
  cancelReservation: (id) => post(`/reservations/${id}/cancel`),
  checkInReservation: (id) => post(`/reservations/${id}/check-in`),
  checkOutReservation: (id) => post(`/reservations/${id}/check-out`),
  archiveReservation: (id) => post(`/reservations/${id}/archive`),
  restoreReservation: (id) => post(`/reservations/${id}/restore`),

  // Front desk views
  getDashboard: () => get('/dashboard'),
  listArrivals: (p) => get('/arrivals', p),
  listDepartures: (p) => get('/departures', p),
  listGuests: (p) => get('/guests', p),
  getGuestHistory: (email, p) => get('/guests/history', { email, ...p }),

  // Analytics and monitoring
  getReport: (p) => get('/reports', p),
  listEvents: (p) => get('/events', p),
};
