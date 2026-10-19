import Modal from './Modal';
import { peso, CHECK_IN_TIME, CHECK_OUT_TIME, DOWNPAYMENT_RATE } from '../utils/format';
import { ROOM_TYPES } from '../utils/roomTypes';

export default function RoomDetailsModal({ room, canBook, onBook, onClose }) {
  const a = room.availability || { available: true, reason: '' };
  const image = ROOM_TYPES[room.type]?.image || '/images/rooms/standard-classic.png';
  return (
    <Modal title={`${room.type}, room ${room.number}`} subtitle={`Floor ${room.floor}`} onClose={onClose}>
      <div className="stack">
        <img className="room-details__image" src={image} alt={`${room.type} room`} />
        <p>{room.description}</p>

        <dl className="meta meta--3">
          <div>
            <dt>Rate</dt>
            <dd>{peso(room.price)} per night</dd>
          </div>
          <div>
            <dt>Sleeps up to</dt>
            <dd>{room.capacity} guests</dd>
          </div>
          <div>
            <dt>Check-in / out</dt>
            <dd>
              {CHECK_IN_TIME} / {CHECK_OUT_TIME}
            </dd>
          </div>
        </dl>

        <div>
          <h3>In the room</h3>
          <ul className="chips chips--spaced">
            {room.amenities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <p className="notice-box">
          Booking needs a {Math.round(DOWNPAYMENT_RATE * 100)}% downpayment. The downpayment is
          non-refundable if the booking is cancelled.
        </p>

        <div className="modal__actions">
          <span className={`badge ${a.available ? 'badge--available' : 'badge--maintenance'}`}>
            {a.available ? 'Available for your dates' : a.reason}
          </span>
          {canBook && (
            <button
              className="btn btn--primary"
              disabled={!a.available}
              onClick={() => {
                onClose();
                onBook(room);
              }}
            >
              Book this room
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
