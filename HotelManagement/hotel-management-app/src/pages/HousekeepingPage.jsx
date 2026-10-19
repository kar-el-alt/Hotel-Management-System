import { useState } from 'react';
import FloorBoard from '../components/FloorBoard';
import Pagination from '../components/Pagination';
import { api } from '../services/api';
import { useList } from '../utils/hooks';
import { formatDateTime } from '../utils/format';

// Staff mark rooms clean after a guest checks out. A cleaned room becomes available again.
export default function HousekeepingPage() {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState(null);
  const queue = useList(api.listRooms, { status: 'cleaning', page, pageSize: 10 }, 10000);

  const clean = async (room) => {
    setNotice(null);
    try {
      await api.markRoomClean(room.number);
      setNotice({ type: 'success', text: `Room ${room.number} is clean and available again.` });
      queue.reload();
      setVersion((v) => v + 1);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Housekeeping</h1>
          <p className="muted">Rooms appear here when a guest checks out. Mark a room clean when it is ready.</p>
        </div>
      </div>

      {notice && (
        <p className={`${notice.type === 'success' ? 'form-success' : 'form-error'} notice-line`} role={notice.type === 'success' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      )}

      <section className="panel" aria-labelledby="queue-title">
        <h2 id="queue-title">Cleaning queue ({queue.total})</h2>
        {queue.items.length === 0 ? (
          <p className="muted">All rooms are clean. Nothing waiting.</p>
        ) : (
          <ul className="task-list">
            {queue.items.map((room) => (
              <li key={room.number}>
                <div>
                  <strong>
                    Room {room.number}, {room.type}
                  </strong>
                  <p className="muted">Floor {room.floor}</p>
                </div>
                <button className="btn btn--primary btn--small" onClick={() => clean(room)}>
                  Mark as clean
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageSize={10} total={queue.total} onPage={setPage} />
      </section>

      <div className="spaced">
        <FloorBoard version={version} />
      </div>
      <p className="muted rack__note">Last updated {formatDateTime(new Date().toISOString())}. The board refreshes every 10 seconds.</p>
    </>
  );
}
