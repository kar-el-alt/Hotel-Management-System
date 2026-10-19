export const ROLES = ['Admin', 'Front Desk', 'Staff', 'Guest'];

// Roles an admin may create. There is only one admin, and guests register themselves.
export const CREATABLE_ROLES = ['Front Desk', 'Staff'];

// Every page that appears in the top bar, and who may open it
export const NAV = [
  { page: 'home', path: '/', label: 'Home', roles: ['Guest'] },
  { page: 'dashboard', path: '/dashboard', label: 'Dashboard', roles: ['Admin', 'Front Desk'] },
  { page: 'book', path: '/book', label: 'Book a room', roles: ['Front Desk'] },
  { page: 'reservations', path: '/reservations', label: 'Reservations', roles: ['Admin', 'Front Desk'] },
  { page: 'bookings', path: '/my-bookings', label: 'My bookings', roles: ['Guest'] },
  { page: 'guests', path: '/guests', label: 'Guests', roles: ['Admin', 'Front Desk'] },
  { page: 'housekeeping', path: '/housekeeping', label: 'Housekeeping', roles: ['Staff'] },
  { page: 'manage-rooms', path: '/manage-rooms', label: 'Rooms', roles: ['Admin'] },
  { page: 'users', path: '/users', label: 'Users', roles: ['Admin'] },
  { page: 'reports', path: '/reports', label: 'Reports', roles: ['Admin', 'Front Desk'] },
  { page: 'archive', path: '/archive', label: 'Archive', roles: ['Admin', 'Front Desk'] },
];

const OPEN_TO_ALL = ['home', 'profile'];

export const canAccess = (role, page) =>
  OPEN_TO_ALL.includes(page) || NAV.some((n) => n.page === page && n.roles.includes(role));

export const navFor = (role) => NAV.filter((n) => n.roles.includes(role));

export const homePath = (role) => {
  if (role === 'Admin' || role === 'Front Desk') return '/dashboard';
  if (role === 'Staff') return '/housekeeping';
  return '/';
};

// Only guests and the front desk can make bookings
export const canBook = (role) => role === 'Guest' || role === 'Front Desk';
