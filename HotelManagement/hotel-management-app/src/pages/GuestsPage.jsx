import { useState } from 'react';
import Pagination from '../components/Pagination';
import ReservationDetails from '../components/ReservationDetails';
import { api } from '../services/api';
import { useList, useQueryState } from '../utils/hooks';
import { peso, formatDate, formatDateTime, initials, reservationLabels, PAGE_SIZE } from '../utils/format';

const stateInfo = {
  'in-house': { label: 'In house', badge: 'badge--res-checked-in' },
  upcoming: { label: 'Upcoming', badge: 'badge--res-confirmed' },
  past: { label: 'Past guest', badge: 'badge--maintenance' },
};

const fetchHistory = (p) => api.getGuestHistory(p.email, p);

// Each guest's history is shown 10 stays at a time
function GuestHistory({ guest }) {
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const history = useList(fetchHistory, { email: guest.email, page, pageSize: 10 });

  return (
    <>
      <h3>Stay history</h3>
      <div className="table-wrap">
        <table className="table table--compact">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Room</th>
              <th>Scheduled</th>
              <th>Checked in</th>
              <th>Checked out</th>
              <th>Guests</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.loading && history.items.length === 0 && (
              <tr>
                <td colSpan="8" className="table__empty">
                  Loading...
                </td>
              </tr>
            )}
            {history.items.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>
                  {s.roomNumber}
                  <div className="muted">{s.roomType}</div>
                </td>
                <td>
                  {formatDate(s.checkIn)} to {formatDate(s.checkOut)}
                </td>
                <td>{s.checkedInAt ? formatDateTime(s.checkedInAt) : '-'}</td>
                <td>{s.checkedOutAt ? formatDateTime(s.checkedOutAt) : '-'}</td>
                <td title={s.occupants.map((o) => `${o.name} (${o.type})`).join(', ')}>
                  {s.adults}A {s.children}C
                  <div className="muted">{s.occupants.map((o) => o.name.split(' ')[0]).join(', ')}</div>
                </td>
                <td>
                  <span className={`badge badge--res-${s.status}`}>{reservationLabels[s.status]}</span>
                </td>
                <td>
                  <button className="btn btn--ghost btn--small" onClick={() => setDetails(s)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={10} total={history.total} onPage={setPage} />
      {details && <ReservationDetails reservation={details} onClose={() => setDetails(null)} />}
    </>
  );
}

export default function GuestsPage() {
  const { query, set } = useQueryState({ search: '', status: 'all' }, PAGE_SIZE);
  const list = useList(api.listGuests, query);
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guests</h1>
          <p className="muted">Guest records and their full check-in history.</p>
        </div>
      </div>

      <div className="toolbar">
        <label className="field field--search">
          <span className="field__label">Search</span>
          <input placeholder="Name, email or phone" value={query.search} onChange={(e) => set({ search: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select value={query.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">All</option>
            <option value="in-house">In house</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past guest</option>
          </select>
        </label>
      </div>

      <div className="guests-layout">
        <section aria-label="Guest list">
          <div className="guest-list">
            {list.loading && list.items.length === 0 && <p className="table__empty">Loading...</p>}
            {!list.loading && list.items.length === 0 && <p className="table__empty">No guests match your search.</p>}
            {list.items.map((g) => (
              <button
                key={g.email}
                className="guest-row"
                aria-pressed={selected && selected.email === g.email}
                onClick={() => setSelected(g)}
              >
                <span className="avatar" aria-hidden="true">
                  {initials(g.name)}
                </span>
                <span className="guest-row__main">
                  <strong>{g.name}</strong>
                  <span className="muted guest-row__email">{g.email}</span>
                </span>
                <span className="guest-row__side">
                  <span className={`badge ${stateInfo[g.state].badge}`}>{stateInfo[g.state].label}</span>
                  <span className="muted">
                    {g.stayCount} {g.stayCount === 1 ? 'stay' : 'stays'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <Pagination page={query.page} pageSize={PAGE_SIZE} total={list.total} onPage={(page) => set({ page })} />
        </section>

        <section className="panel profile" aria-label="Guest profile">
          {!selected ? (
            <p className="muted">Select a guest to see their profile and check-in history.</p>
          ) : (
            <>
              <div className="profile__head">
                <span className="avatar avatar--large" aria-hidden="true">
                  {initials(selected.name)}
                </span>
                <div>
                  <h2>{selected.name}</h2>
                  <p className="muted">{selected.email}</p>
                  <p className="muted">{selected.phone || 'No phone number'}</p>
                </div>
              </div>
              <dl className="profile__stats">
                <div>
                  <dt>Completed or current stays</dt>
                  <dd>{selected.stayCount}</dd>
                </div>
                <div>
                  <dt>Total billed</dt>
                  <dd>{peso(selected.totalSpent)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{stateInfo[selected.state].label}</dd>
                </div>
              </dl>
              <GuestHistory key={selected.email} guest={selected} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
