import { useState } from 'react';
import RoomBoard from './RoomBoard';
import { api } from '../services/api';
import { useList, useResource } from '../utils/hooks';
import { roomStatusLabels } from '../utils/format';

const statuses = ['available', 'occupied', 'cleaning', 'maintenance'];

// The room board, shown one floor at a time so it stays fast with many rooms.
export default function FloorBoard({ onSelect, selected, version = 0, pollMs = 10000 }) {
  const floors = useResource(api.getFloors);
  const [floor, setFloor] = useState(null);
  const active = floor || (floors.data && floors.data[0]) || null;
  const rooms = useList(api.listRooms, { floor: active || 0, pageSize: 50, v: version }, pollMs);

  return (
    <section className="rack" aria-labelledby="rack-title">
      <div className="rack__head">
        <h2 id="rack-title">Room board</h2>
        <ul className="legend">
          {statuses.map((s) => (
            <li key={s}>
              <span className={`legend__dot legend__dot--${s}`} aria-hidden="true" />
              {roomStatusLabels[s]}
            </li>
          ))}
        </ul>
      </div>

      <div className="segmented" role="group" aria-label="Choose a floor">
        {(floors.data || []).map((n) => (
          <button key={n} className={n === active ? 'is-active' : ''} onClick={() => setFloor(n)}>
            Floor {n}
          </button>
        ))}
      </div>

      <div className="shelf">
        {rooms.loading && rooms.items.length === 0 ? (
          <p className="muted">Loading rooms...</p>
        ) : (
          <RoomBoard rooms={rooms.items} selected={selected} onSelect={onSelect} />
        )}
      </div>
    </section>
  );
}
