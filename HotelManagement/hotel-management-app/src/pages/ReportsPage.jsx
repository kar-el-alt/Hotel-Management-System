import { useState } from 'react';
import DateRange from '../components/DateRange';
import Pagination from '../components/Pagination';
import { api } from '../services/api';
import { useList, useResource } from '../utils/hooks';
import { addDays, today, formatDate, formatDateTime, peso, PAGE_SIZE } from '../utils/format';

const eventGroups = {
  All: 'All activity',
  booking: 'Bookings and cancellations',
  stay: 'Check-ins and check-outs',
  room: 'Rooms',
  user: 'Users',
  archive: 'Archive',
};

const typeLabel = {
  'booking.created': 'Booking',
  'booking.cancelled': 'Cancellation',
  'stay.checked-in': 'Check-in',
  'stay.checked-out': 'Check-out',
  'room.cleaned': 'Room cleaned',
  'room.created': 'Room added',
  'room.updated': 'Room updated',
  'room.deleted': 'Room deleted',
  'room.maintenance': 'Maintenance',
  'user.created': 'User added',
  'user.deactivated': 'User deactivated',
  'user.reactivated': 'User reactivated',
  'archive.archived': 'Archived',
  'archive.restored': 'Restored',
};

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <span className="muted">{note}</span>}
    </div>
  );
}

function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.bookings, d.checkIns)));
  const step = Math.ceil(daily.length / 10);
  return (
    <div className="chart" role="img" aria-label="Bookings made and check-ins for each day in the range">
      <div className="chart__bars">
        {daily.map((d) => (
          <div className="chart__day" key={d.date} title={`${formatDate(d.date)}: ${d.bookings} bookings, ${d.checkIns} check-ins`}>
            <div className="chart__pair">
              <span className="chart__bar chart__bar--a" style={{ height: `${(d.bookings / max) * 100}%` }} />
              <span className="chart__bar chart__bar--b" style={{ height: `${(d.checkIns / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="chart__labels">
        {daily.map((d, i) => (
          <span key={d.date}>{i % step === 0 ? formatDate(d.date) : ''}</span>
        ))}
      </div>
      <p className="legend legend--inline">
        <span>
          <span className="legend__dot legend__dot--available" /> Bookings made
        </span>
        <span>
          <span className="legend__dot legend__dot--occupied" /> Check-ins
        </span>
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState({ from: addDays(-29), to: today() });
  const [group, setGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const valid = Boolean(range.from && range.to && range.to >= range.from);
  const days = valid ? Math.round((new Date(range.to) - new Date(range.from)) / 86400000) + 1 : 0;
  const tooLong = days > 366;
  const ready = valid && !tooLong;

  const report = useResource(api.getReport, ready ? range : {});
  const events = useList(api.listEvents, {
    from: ready ? range.from : '',
    to: ready ? range.to : '',
    type: group,
    search,
    page,
    pageSize: PAGE_SIZE,
  });

  const r = report.data;

  const changeRange = (from, to) => {
    setRange({ from, to });
    setPage(1);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports and activity</h1>
          <p className="muted">Pick a date range to review bookings, occupancy, revenue, and what happened in the hotel.</p>
        </div>
      </div>

      <DateRange from={range.from} to={range.to} onChange={changeRange} />
      {tooLong && (
        <p className="form-error" role="alert">
          Choose a range of one year or less.
        </p>
      )}

      {ready && report.error && (
        <p className="form-error" role="alert">
          {report.error}
        </p>
      )}

      {ready && r && (
        <>
          <dl className="stats">
            <Stat label="Bookings made" value={r.bookings} />
            <Stat label="Check-ins" value={r.checkIns} />
            <Stat label="Check-outs" value={r.checkOuts} />
            <Stat label="Cancellations" value={r.cancellations} />
            <Stat label="Occupancy" value={`${r.occupancy}%`} note="Nights sold / room nights" />
            <Stat label="Stay revenue" value={peso(r.stayRevenue)} note="From completed stays" />
            <Stat label="Downpayments collected" value={peso(r.downpaymentsCollected)} />
            <Stat label="Forfeited downpayments" value={peso(r.forfeited)} note="Non-refundable cancellations" />
          </dl>

          <div className="two-col two-col--top">
            <section className="panel" aria-labelledby="type-title">
              <h2 id="type-title">By room type</h2>
              <div className="table-wrap">
                <table className="table table--compact">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Bookings</th>
                      <th>Nights sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.byType.map((t) => (
                      <tr key={t.type}>
                        <td>{t.type}</td>
                        <td>{t.bookings}</td>
                        <td>{t.nights}</td>
                        <td>{peso(t.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel" aria-labelledby="daily-title">
              <h2 id="daily-title">Day by day</h2>
              {r.daily ? <DailyChart daily={r.daily} /> : <p className="muted">Choose a range of 62 days or less to see the daily chart.</p>}
            </section>
          </div>
        </>
      )}

      <section className="panel spaced" aria-labelledby="log-title">
        <h2 id="log-title">Activity log</h2>
        <div className="toolbar">
          <label className="field field--search">
            <span className="field__label">Search</span>
            <input
              placeholder="Guest, room, staff member or booking ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">Type</span>
            <select
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setPage(1);
              }}
            >
              {Object.entries(eventGroups).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>By</th>
                <th>What happened</th>
              </tr>
            </thead>
            <tbody>
              {events.items.length === 0 && (
                <tr>
                  <td colSpan="4" className="table__empty">
                    {events.loading ? 'Loading...' : 'No activity in this range.'}
                  </td>
                </tr>
              )}
              {events.items.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateTime(e.at)}</td>
                  <td>
                    <span className="badge badge--maintenance">{typeLabel[e.type] || e.type}</span>
                  </td>
                  <td>{e.actor}</td>
                  <td>{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={events.total} onPage={setPage} />
      </section>
    </>
  );
}
