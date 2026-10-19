import Modal from './Modal';
import { peso, formatDateLong, formatDateTime, nightsBetween, reservationLabels, CHECK_IN_TIME, CHECK_OUT_TIME } from '../utils/format';

export default function ReservationDetails({ reservation: r, onClose }) {
  return (
    <Modal
      title={`Booking ${r.id}`}
      subtitle={`${r.guest}, room ${r.roomNumber}${r.roomType ? ` (${r.roomType})` : ''}`}
      onClose={onClose}
      wide
    >
      <div className="stack">
        <span className={`badge badge--res-${r.status}`}>{reservationLabels[r.status]}</span>

        <dl className="meta meta--3">
          <div>
            <dt>Scheduled stay</dt>
            <dd>
              {formatDateLong(r.checkIn)} to {formatDateLong(r.checkOut)} ({nightsBetween(r.checkIn, r.checkOut)} nights)
            </dd>
          </div>
          <div>
            <dt>Actual check-in</dt>
            <dd>{r.checkedInAt ? formatDateTime(r.checkedInAt) : `Not yet (from ${CHECK_IN_TIME})`}</dd>
          </div>
          <div>
            <dt>Actual check-out</dt>
            <dd>{r.checkedOutAt ? formatDateTime(r.checkedOutAt) : `Not yet (by ${CHECK_OUT_TIME})`}</dd>
          </div>
          <div>
            <dt>Booked on</dt>
            <dd>
              {formatDateTime(r.createdAt)} by {r.createdBy}
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              {r.email}
              <br />
              {r.phone}
            </dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>
              {r.adults} adult{r.adults === 1 ? '' : 's'}, {r.children} child{r.children === 1 ? '' : 'ren'}
            </dd>
          </div>
        </dl>

        <div>
          <h3>Who is staying</h3>
          <div className="table-wrap">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {r.occupants.map((o, i) => (
                  <tr key={`${o.name}-${i}`}>
                    <td>
                      {o.name}
                      {i === 0 && <span className="you-tag">booked by</span>}
                    </td>
                    <td>{o.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3>Payment</h3>
          <dl className="meta meta--3">
            <div>
              <dt>Room total</dt>
              <dd>{peso(r.total)}</dd>
            </div>
            <div>
              <dt>Downpayment</dt>
              <dd>
                {peso(r.downpayment)} via {r.payment.method}
                {r.payment.reference && <span className="muted"> (ref {r.payment.reference})</span>}
              </dd>
            </div>
            <div>
              <dt>{r.status === 'cancelled' ? 'Forfeited' : 'Balance at check-in'}</dt>
              <dd>{r.status === 'cancelled' ? `${peso(r.forfeited)} (non-refundable)` : peso(r.balance)}</dd>
            </div>
          </dl>
          {r.cancelledAt && <p className="muted">Cancelled on {formatDateTime(r.cancelledAt)}.</p>}
          {r.archived && <p className="muted">Archived on {formatDateTime(r.archivedAt)}.</p>}
        </div>
      </div>
    </Modal>
  );
}
