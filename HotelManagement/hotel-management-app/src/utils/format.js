const pad = (n) => String(n).padStart(2, '0');

export const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (offset, from) => {
  const d = from ? new Date(`${from}T00:00:00`) : new Date();
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
};

export const today = () => addDays(0);

// "2026-10-14T09:30:00.000Z" -> "2026-10-14" in the viewer's local time
export const dateOf = (iso) => toIsoDate(new Date(iso));

export const nightsBetween = (checkIn, checkOut) =>
  Math.max(
    0,
    Math.round((new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000)
  );

const pesoFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});
export const peso = (amount) => pesoFormat.format(amount || 0);

export const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : '';

export const formatDateLong = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not yet';

export const initials = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

// Hotel policy
export const DOWNPAYMENT_RATE = 0.3; // 30% of the room total, non-refundable
export const CHECK_IN_TIME = '2:00 PM';
export const CHECK_OUT_TIME = '12:00 PM';
export const PAGE_SIZE = 10;
export const MAX_ACTIVE_BOOKINGS = 3;

export const roomStatusLabels = {
  available: 'Available',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  maintenance: 'Under maintenance',
};

export const reservationLabels = {
  confirmed: 'Confirmed',
  'checked-in': 'Checked in',
  'checked-out': 'Checked out',
  cancelled: 'Cancelled',
};
