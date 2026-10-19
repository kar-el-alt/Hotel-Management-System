import { useState } from 'react';
import Pagination from '../components/Pagination';
import { api } from '../services/api';
import { useList, useResource } from '../utils/hooks';
import { today, formatDate, peso } from '../utils/format';

const DAY = 24 * 60 * 60 * 1000;

export default function Dashboard({ user }) {
  const canAct = user.role === 'Front Desk';
  const [notice, setNotice] = useState('');
  const [arrPage, setArrPage] = useState(1);
  const [depPage, setDepPage] = useState(1);

  // Refresh every 10 seconds so new bookings show up as arrivals without reloading
  const stats = useResource(api.getDashboard, undefined, 10000);
  const arrivals = useList(api.listArrivals, { page: arrPage, pageSize: 10 }, 10000);
  const departures = useList(api.listDepartures, { page: depPage, pageSize: 10 }, 10000);

  const refreshAll = () => {
    stats.reload();
    arrivals.reload();
    departures.reload();
  };

  const act = async (fn, id) => {
    setNotice('');
    try {
      await fn(id);
      refreshAll();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const s = stats.data;
  const t = today();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Front desk</h1>
          <p className="muted">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {notice && (
        <div className="notice" role="alert">
          <span>{notice}</span>
          <button className="btn btn--ghost" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </div>
      )}

      <dl className="figures">
        <div>
          <dt>Occupancy</dt>
          <dd>{s ? `${s.occupancy}%` : '...'}</dd>
        </div>
        <div>
          <dt>Arriving today</dt>
          <dd>{s ? s.arrivalsToday : '...'}</dd>
        </div>
        <div>
          <dt>Leaving today</dt>
          <dd>{s ? s.departuresToday : '...'}</dd>
        </div>
        <div>
          <dt>Waiting for cleaning</dt>
          <dd>{s ? s.cleaning : '...'}</dd>
        </div>
      </dl>

      <div className="two-col">
        <section className="panel" aria-labelledby="arrivals-title">
          <h2 id="arrivals-title">Arrivals (today and the next 7 days)</h2>
          {arrivals.items.length === 0 ? (
            <p className="muted">No arrivals coming up.</p>
          ) : (
            <ul className="task-list">
              {arrivals.items.map((r) => {
                const isNew = Date.now() - new Date(r.createdAt).getTime() < DAY;
                const ready = r.checkIn <= t;
                return (
                  <li key={r.id}>
                    <div>
                      <strong>{r.guest}</strong>
                      {isNew && <span className="new-tag">New</span>}
                      <p className="muted">
                        Room {r.roomNumber}, {r.roomType}. {r.adults} adult{r.adults === 1 ? '' : 's'}
                        {r.children > 0 ? `, ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''}.
                      </p>
                      <p className="muted">
                        {r.checkIn === t ? 'Arrives today' : r.checkIn < t ? 'Late arrival' : `Arrives ${formatDate(r.checkIn)}`}
                        , balance {peso(r.balance)}
                      </p>
                    </div>
                    {canAct && ready && (
                      <button
                        className="btn btn--secondary btn--small"
                        onClick={() => act(api.checkInReservation, r.id)}
                      >
                        Check in
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination page={arrPage} pageSize={10} total={arrivals.total} onPage={setArrPage} />
        </section>

        <section className="panel" aria-labelledby="departures-title">
          <h2 id="departures-title">Departures due</h2>
          {departures.items.length === 0 ? (
            <p className="muted">No guests are due to leave.</p>
          ) : (
            <ul className="task-list">
              {departures.items.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.guest}</strong>
                    <p className="muted">
                      Room {r.roomNumber}, {r.roomType}. Due {r.checkOut === t ? 'today' : formatDate(r.checkOut)}.
                    </p>
                    <p className="muted">Balance {peso(r.balance)}</p>
                  </div>
                  {canAct && (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={() => act(api.checkOutReservation, r.id)}
                    >
                      Check out
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Pagination page={depPage} pageSize={10} total={departures.total} onPage={setDepPage} />
        </section>
      </div>
    </>
  );
}
