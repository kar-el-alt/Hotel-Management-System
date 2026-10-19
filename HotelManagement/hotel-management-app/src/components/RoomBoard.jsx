import { roomStatusLabels } from '../utils/format';

// The room board: one key tag per room. Occupied rooms are never clickable.
// Pass onSelect to make the other tags clickable; leave it out for a read-only board.
export default function RoomBoard({ rooms, selected, onSelect }) {
  return (
    <div className="shelf__keys">
      {rooms.map((room) => {
        const label = roomStatusLabels[room.status];
        const content = (
          <>
            <span className="key__number">{room.number}</span>
            <span className="key__status">{label}</span>
          </>
        );
        if (!onSelect || room.status === 'occupied') {
          return (
            <div
              key={room.number}
              className={`key key--${room.status} is-static`}
              role="img"
              aria-label={`Room ${room.number}, ${label}`}
            >
              {content}
            </div>
          );
        }
        return (
          <button
            key={room.number}
            className={`key key--${room.status}`}
            aria-pressed={selected === room.number}
            aria-label={`Room ${room.number}, ${label}`}
            onClick={() => onSelect(selected === room.number ? null : room.number)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
