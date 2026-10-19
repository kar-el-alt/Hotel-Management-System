import { useState } from 'react';
import Pagination from '../components/Pagination';
import DateRange from '../components/DateRange';
import ConfirmDialog from '../components/ConfirmDialog';
import ReservationDetails from '../components/ReservationDetails';
import { api } from '../services/api';
import { useList, useQueryState } from '../utils/hooks';
import { ROOM_TYPE_NAMES } from '../utils/roomTypes';
import { today, formatDate, nightsBetween, peso, reservationLabels, PAGE_SIZE } from '../utils/format';

// mode: "all" (admin and front desk), "mine" (guest), or "archive"
export default function ReservationsPage({ user, mode = 'all' }) {
  const isGuest = user.role === 'Guest';
  const isFront = user.role === 'Front Desk';
  const archive = mode === 'archive';
  const { query, set } = useQueryState({ search: '', status: 'all', from: '', to: '', roomType: 'All' }, PAGE_SIZE);
  const list = useList(api.listReservations, { ...query, archived: archive });
  const [details, setDetails] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [notice, setNotice] = useState(null);

  const statusOptions = archive ? ['all', 'checked-out', 'cancelled'] : ['all', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];
  const title = archive ? 'Archive' : isGuest ? 'My bookings' : 'Reservations';
  const t = today();

  const run = async (fn, id, okText) => {
    setNotice(null);
    try {
      await fn(id);
      list.reload();
      if (okText) setNotice({ type: 'success', text: okText });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">
            {archive
              ? 'Completed and cancelled bookings kept for records. They are separate from active bookings.'
              : isGuest
                ? 'Your upcoming and past stays.'
                : 'All bookings. Filter by status, arrival dates, or room type.'}
          </p>
        </div>
      </div>

      <div className="toolbar">
        <label className="field field--search">
          <span className="field__label">Search</span>
          <input
            placeholder={isGuest ? 'Room or booking ID' : 'Guest, email, room or booking ID'}
            value={query.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select value={query.status} onChange={(e) => set({ status: e.target.value })}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : reservationLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Room type</span>
          <select value={query.roomType} onChange={(e) => set({ roomType: e.target.value })}>
            <option>All</option>
            {ROOM_TYPE_NAMES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <DateRange
        from={query.from}
        to={query.to}
        labelFrom="Arrival from"
        labelTo="Arrival to"
        onChange={(from, to) => set({ from, to })}
      />

      {notice && (
        <p className={`${notice.type === 'success' ? 'form-success' : 'form-error'} notice-line`} role={notice.type === 'success' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      )}
      {list.error && (
        <p className="form-error" role="alert">
          {list.error}
        </p>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Stay</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan="8" className="table__empty">
                  Loading...
                </td>
              </tr>
            )}
            {!list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan="8" className="table__empty">
                  {isGuest && !archive
                    ? 'No bookings found. Open Home to book your first stay.'
                    : 'No bookings match. Clear the search or change a filter.'}
                </td>
              </tr>
            )}
            {list.items.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.id}
                  <div className="muted">{formatDate(r.createdAt.slice(0, 10))}</div>
                </td>
                <td>
                  <strong>{r.guest}</strong>
                  <div className="muted">{r.email}</div>
                </td>
                <td>
                  {r.roomNumber}
                  <div className="muted">{r.roomType}</div>
                </td>
                <td>
                  {formatDate(r.checkIn)} to {formatDate(r.checkOut)}
                  <div className="muted">{nightsBetween(r.checkIn, r.checkOut)} nights</div>
                </td>
                <td>
                  {r.adults}A {r.children}C
                </td>
                <td>
                  {peso(r.total)}
                  <div className="muted">Down {peso(r.downpayment)}</div>
                </td>
                <td>
                  <span className={`badge badge--res-${r.status}`}>{reservationLabels[r.status]}</span>
                </td>
                <td className="table__actions">
                  <button className="btn btn--ghost btn--small" onClick={() => setDetails(r)}>
                    Details
                  </button>
                  {!archive && isFront && r.status === 'confirmed' && r.checkIn <= t && (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={() => run(api.checkInReservation, r.id, `${r.guest} is checked in to room ${r.roomNumber}.`)}
                    >
                      Check in
                    </button>
                  )}
                  {!archive && isFront && r.status === 'checked-in' && (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={() => run(api.checkOutReservation, r.id, `${r.guest} is checked out. Room ${r.roomNumber} is waiting for cleaning.`)}
                    >
                      Check out
                    </button>
                  )}
                  {!archive && (isFront || isGuest) && r.status === 'confirmed' && (
                    <button className="btn btn--ghost btn--small" onClick={() => setCancelling(r)}>
                      Cancel
                    </button>
                  )}
                  {!archive && !isGuest && (r.status === 'checked-out' || r.status === 'cancelled') && (
                    <button className="btn btn--ghost btn--small" onClick={() => setArchiving(r)}>
                      Archive
                    </button>
                  )}
                  {archive && !isGuest && (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={() => run(api.restoreReservation, r.id, `Booking ${r.id} was restored.`)}
                    >
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={query.page} pageSize={PAGE_SIZE} total={list.total} onPage={(page) => set({ page })} />

      {details && <ReservationDetails reservation={details} onClose={() => setDetails(null)} />}

      {cancelling && (
        <ConfirmDialog
          title={`Cancel booking ${cancelling.id}?`}
          confirmLabel="Cancel this booking"
          cancelLabel="Keep booking"
          danger
          checkLabel="I understand the downpayment will not be refunded."
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            await api.cancelReservation(cancelling.id);
            const r = cancelling;
            setCancelling(null);
            list.reload();
            setNotice({ type: 'success', text: `Booking ${r.id} was cancelled. The downpayment of ${peso(r.downpayment)} was forfeited.` });
          }}
        >
          <p>
            {cancelling.guest}, room {cancelling.roomNumber}, {formatDate(cancelling.checkIn)} to{' '}
            {formatDate(cancelling.checkOut)}.
          </p>
          <div className="disclosure" role="note">
            <h3>Non-refundable downpayment</h3>
            <p>
              Cancelling forfeits the downpayment of <strong>{peso(cancelling.downpayment)}</strong>. It is
              not refunded, and the room is released for other guests.
            </p>
          </div>
        </ConfirmDialog>
      )}

      {archiving && (
        <ConfirmDialog
          title={`Archive booking ${archiving.id}?`}
          confirmLabel="Archive"
          onClose={() => setArchiving(null)}
          onConfirm={async () => {
            await api.archiveReservation(archiving.id);
            const r = archiving;
            setArchiving(null);
            list.reload();
            setNotice({ type: 'success', text: `Booking ${r.id} moved to the archive. You can restore it from the Archive page.` });
          }}
        >
          <p>The booking is kept in the archive and no longer appears in the active list.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
