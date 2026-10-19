import { peso } from '../utils/format';
import { ROOM_TYPES } from '../utils/roomTypes';

export default function RoomCard({ room, canBook, onDetails, onBook }) {
  const a = room.availability || { available: true, reason: '' };
  const shown = room.amenities.slice(0, 3);
  const more = room.amenities.length - shown.length;
  const image = ROOM_TYPES[room.type]?.image || '/images/rooms/standard-classic.png';

  return (
    <article className={`room-card ${a.available ? '' : 'is-unavailable'}`}>
      <img className="room-card__image" src={image} alt={`${room.type} room`} />
      <div className="room-card__plate">
        <span className="room-card__number">{room.number}</span>
        <span className="room-card__type">{room.type}</span>
      </div>
      <div className="room-card__body">
        <p className="muted">
          Floor {room.floor}, sleeps up to {room.capacity}
        </p>
        <ul className="chips">
          {shown.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {more > 0 && <li>+{more} more</li>}
        </ul>
        <span className={`badge ${a.available ? 'badge--available' : 'badge--maintenance'}`}>
          {a.available ? 'Available for your dates' : a.reason}
        </span>
        <div className="room-card__foot">
          <div>
            <strong className="room-card__price">{peso(room.price)}</strong>
            <span className="muted"> per night</span>
          </div>
          <div className="room-card__actions">
            <button className="btn btn--secondary btn--small" onClick={() => onDetails(room)}>
              Details
            </button>
            {canBook && (
              <button
                className="btn btn--primary btn--small"
                disabled={!a.available}
                onClick={() => onBook(room)}
              >
                Book
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
