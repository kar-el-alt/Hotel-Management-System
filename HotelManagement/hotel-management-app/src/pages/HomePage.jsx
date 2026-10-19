import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import RoomDetailsModal from '../components/RoomDetailsModal';
import BookingForm from '../components/BookingForm';
import Pagination from '../components/Pagination';
import { api } from '../services/api';
import { useList } from '../utils/hooks';
import { ROOM_TYPE_NAMES } from '../utils/roomTypes';
import { addDays, today, CHECK_IN_TIME, CHECK_OUT_TIME, DOWNPAYMENT_RATE } from '../utils/format';
import { canBook } from '../utils/permissions';
import Modal from '../components/Modal';

const PAGE_SIZE = 6;
const HOTEL_VIEWS = [
  {
    title: 'Hotel exterior',
    image: '/images/heritage-hotel-exterior.png',
    description: 'The Heritage Hotel entrance on Roxas Boulevard.',
  },
  {
    title: 'Guest rooms',
    image: '/images/rooms/standard-suite.png',
    description: 'A look inside one of the hotel’s comfortable guest rooms.',
  },
  {
    title: 'Club-level lounge',
    image: '/images/rooms/premium-lounge.png',
    description: 'A lounge-style room included in the hotel’s club-level experience.',
  },
];

// The public home page and the "Book a room" page share the same room search.
export default function HomePage({ user, hero = true }) {
  const navigate = useNavigate();
  const [f, setF] = useState({
    checkIn: addDays(1),
    checkOut: addDays(2),
    adults: 2,
    children: 0,
    type: 'All',
    onlyAvailable: true,
  });
  const [page, setPage] = useState(1);
  const [detailsRoom, setDetailsRoom] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [hotelView, setHotelView] = useState(null);

  const change = (patch) => {
    setF((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  // Real-time validation of the search
  const errors = {};
  if (f.checkIn < today()) errors.checkIn = 'Check-in cannot be in the past.';
  if (f.checkOut <= f.checkIn) errors.checkOut = 'Check-out must be after check-in.';
  const adults = Number(f.adults);
  const children = Number(f.children);
  if (!Number.isInteger(adults) || adults < 1) errors.adults = 'At least 1 adult.';
  if (!Number.isInteger(children) || children < 0) errors.children = 'Use 0 or more.';
  if (!errors.adults && !errors.children && adults + children > 8) errors.adults = 'Up to 8 guests.';
  const valid = Object.keys(errors).length === 0;

  const params = {
    page,
    pageSize: PAGE_SIZE,
    type: f.type,
    ...(valid
      ? { checkIn: f.checkIn, checkOut: f.checkOut, adults, children, onlyAvailable: f.onlyAvailable }
      : {}),
  };
  const rooms = useList(api.listRooms, params);

  const bookingAllowed = !user || canBook(user.role);
  const onBook = (room) => {
    if (!user) {
      navigate('/login', { state: { message: 'Sign in or create an account to book a room.' } });
      return;
    }
    setBookingRoom(room);
  };

  return (
    <>
      {hero && (
        <section className="hero">
          <img
            className="hero__image"
            src="/images/heritage-hotel-exterior.png"
            alt="Heritage Hotel entrance at night"
          />
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__inner">
            <p className="hero__eyebrow">Roxas Boulevard corner EDSA, Pasay City</p>
            <h1>Heritage Hotel</h1>
            <p className="hero__lead">
              Air-conditioned rooms with free Wi-Fi, a short drive from the airport and SM Mall of Asia. Check
              live availability and book in a few minutes.
            </p>
            <p className="hero__facts">
              Check-in from {CHECK_IN_TIME} &middot; Check-out by {CHECK_OUT_TIME} &middot;{' '}
              {Math.round(DOWNPAYMENT_RATE * 100)}% downpayment to confirm
            </p>
          </div>
        </section>
      )}

      <div className={hero ? 'page' : undefined}>
        {!hero && (
          <div className="page-head">
            <div>
              <h1>Book a room</h1>
              <p className="muted">Search by dates and guests, then book for a walk-in or phone guest.</p>
            </div>
          </div>
        )}

        <section className="search" aria-label="Search rooms">
          <label className={`field ${errors.checkIn ? 'has-error' : ''}`}>
            <span className="field__label">Check-in</span>
            <input type="date" min={today()} value={f.checkIn} onChange={(e) => change({ checkIn: e.target.value })} />
            {errors.checkIn && <span className="field__error" role="alert">{errors.checkIn}</span>}
          </label>
          <label className={`field ${errors.checkOut ? 'has-error' : ''}`}>
            <span className="field__label">Check-out</span>
            <input type="date" min={f.checkIn} value={f.checkOut} onChange={(e) => change({ checkOut: e.target.value })} />
            {errors.checkOut && <span className="field__error" role="alert">{errors.checkOut}</span>}
          </label>
          <label className={`field ${errors.adults ? 'has-error' : ''}`}>
            <span className="field__label">Adults</span>
            <input type="number" min="1" max="8" value={f.adults} onChange={(e) => change({ adults: e.target.value })} />
            {errors.adults && <span className="field__error" role="alert">{errors.adults}</span>}
          </label>
          <label className={`field ${errors.children ? 'has-error' : ''}`}>
            <span className="field__label">Children</span>
            <input type="number" min="0" max="7" value={f.children} onChange={(e) => change({ children: e.target.value })} />
            {errors.children && <span className="field__error" role="alert">{errors.children}</span>}
          </label>
          <label className="field">
            <span className="field__label">Room type</span>
            <select value={f.type} onChange={(e) => change({ type: e.target.value })}>
              <option>All</option>
              {ROOM_TYPE_NAMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="check search__check">
            <input
              type="checkbox"
              checked={f.onlyAvailable}
              onChange={(e) => change({ onlyAvailable: e.target.checked })}
            />
            Only show rooms I can book
          </label>
        </section>

        {!user && (
          <p className="notice-box">
            You can browse rooms and rates without an account. Sign in or create a guest account to book.
          </p>
        )}

        {rooms.error && (
          <p className="form-error" role="alert">
            {rooms.error}
          </p>
        )}
        {rooms.loading && rooms.items.length === 0 ? (
          <p className="muted" role="status">
            Loading rooms...
          </p>
        ) : rooms.items.length === 0 ? (
          <div className="panel">
            <h2>No rooms match</h2>
            <p className="muted">Try other dates, fewer guests, or turn off "Only show rooms I can book".</p>
          </div>
        ) : (
          <div className="room-grid">
            {rooms.items.map((room) => (
              <RoomCard
                key={room.number}
                room={room}
                canBook={bookingAllowed}
                onDetails={setDetailsRoom}
                onBook={onBook}
              />
            ))}
          </div>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={rooms.total} onPage={setPage} />
      </div>

      {hero && (
        <section className="page hotel-gallery" aria-labelledby="hotel-gallery-title">
          <div className="page-head">
            <div>
              <h2 id="hotel-gallery-title">Take a look around</h2>
              <p className="muted">Explore the hotel and its guest spaces.</p>
            </div>
          </div>
          <div className="hotel-gallery__grid">
            {HOTEL_VIEWS.map((view) => (
              <button
                className="hotel-gallery__card"
                key={view.title}
                type="button"
                onClick={() => setHotelView(view)}
                aria-label={`View ${view.title} photo`}
              >
                <img src={view.image} alt="" />
                <span className="hotel-gallery__caption">
                  <strong>{view.title}</strong>
                  <span>{view.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {hotelView && (
        <Modal
          title={hotelView.title}
          subtitle={hotelView.description}
          wide
          onClose={() => setHotelView(null)}
        >
          <img className="hotel-gallery__large" src={hotelView.image} alt={hotelView.title} />
        </Modal>
      )}

      {detailsRoom && (
        <RoomDetailsModal
          room={detailsRoom}
          canBook={bookingAllowed}
          onBook={onBook}
          onClose={() => setDetailsRoom(null)}
        />
      )}

      {bookingRoom && (
        <BookingForm
          room={bookingRoom}
          user={user}
          defaults={{ checkIn: f.checkIn, checkOut: f.checkOut, adults, children }}
          onClose={() => setBookingRoom(null)}
          onBooked={rooms.reload}
        />
      )}
    </>
  );
}
