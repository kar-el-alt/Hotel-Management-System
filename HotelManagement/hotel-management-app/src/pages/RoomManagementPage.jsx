import { useState } from 'react';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import Field from '../components/Field';
import ConfirmDialog from '../components/ConfirmDialog';
import RoomForm from '../components/RoomForm';
import { api } from '../services/api';
import { useForm, useList, useQueryState } from '../utils/hooks';
import { ROOM_TYPE_NAMES } from '../utils/roomTypes';
import { lengthProblem } from '../utils/validation';
import { peso, roomStatusLabels, PAGE_SIZE } from '../utils/format';

const statusBadge = {
  available: 'badge--available',
  occupied: 'badge--res-checked-in',
  cleaning: 'badge--res-confirmed',
  maintenance: 'badge--maintenance',
};

// Asks why a room is going under maintenance
function MaintenanceDialog({ room, onDone, onClose }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useForm({ note: '' }, (v) => {
    const e = {};
    const p = lengthProblem(v.note, 5, 120, 'The note');
    if (p) e.note = p;
    return e;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.touchAll()) return;
    setBusy(true);
    setError('');
    try {
      await onDone(form.values.note);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Put room ${room.number} under maintenance`} subtitle="The room cannot be booked until it returns to service." onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="What needs fixing?" error={form.errors.note}>
          <textarea rows="3" {...form.bind('note')} autoFocus />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving...' : 'Set under maintenance'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function RoomManagementPage() {
  const { query, set } = useQueryState({ search: '', type: 'All', status: 'All' }, PAGE_SIZE);
  const list = useList(api.listRooms, query);
  const [editing, setEditing] = useState(null); // null | 'new' | room
  const [maintaining, setMaintaining] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState(null);

  const ok = (text) => {
    setNotice({ type: 'success', text });
    list.reload();
  };

  const save = async (data) => {
    if (editing === 'new') {
      const room = await api.createRoom(data);
      ok(`Room ${room.number} was added.`);
    } else {
      const room = await api.updateRoom(editing.number, data);
      ok(`Room ${room.number} was updated.`);
    }
    setEditing(null);
  };

  const returnToService = async (room) => {
    setNotice(null);
    try {
      await api.setMaintenance(room.number, false);
      ok(`Room ${room.number} is back in service.`);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Room management</h1>
          <p className="muted">Add rooms, change rates and capacity, or take a room out of service.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setEditing('new')}>
          Add room
        </button>
      </div>

      <div className="toolbar">
        <label className="field field--search">
          <span className="field__label">Search</span>
          <input placeholder="Room number or type" value={query.search} onChange={(e) => set({ search: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Type</span>
          <select value={query.type} onChange={(e) => set({ type: e.target.value })}>
            <option>All</option>
            {ROOM_TYPE_NAMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select value={query.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="All">All</option>
            {Object.entries(roomStatusLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <p className={`${notice.type === 'success' ? 'form-success' : 'form-error'} notice-line`} role={notice.type === 'success' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Rate</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan="6" className="table__empty">
                  Loading...
                </td>
              </tr>
            )}
            {!list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan="6" className="table__empty">
                  No rooms match. Clear the search or change a filter.
                </td>
              </tr>
            )}
            {list.items.map((room) => (
              <tr key={room.number}>
                <td>
                  <strong>{room.number}</strong>
                  <div className="muted">Floor {room.floor}</div>
                </td>
                <td>{room.type}</td>
                <td>{room.capacity} guests</td>
                <td>{peso(room.price)}</td>
                <td>
                  <span className={`badge ${statusBadge[room.status]}`}>{roomStatusLabels[room.status]}</span>
                  {room.status === 'maintenance' && <div className="muted">{room.maintenanceNote}</div>}
                </td>
                <td className="table__actions">
                  <button className="btn btn--secondary btn--small" onClick={() => setEditing(room)}>
                    Edit
                  </button>
                  {room.status === 'maintenance' ? (
                    <button className="btn btn--ghost btn--small" onClick={() => returnToService(room)}>
                      Return to service
                    </button>
                  ) : (
                    <button className="btn btn--ghost btn--small" onClick={() => setMaintaining(room)}>
                      Under maintenance
                    </button>
                  )}
                  <button className="btn btn--ghost btn--small btn--danger-text" onClick={() => setDeleting(room)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={query.page} pageSize={PAGE_SIZE} total={list.total} onPage={(page) => set({ page })} />

      {editing && <RoomForm room={editing === 'new' ? null : editing} onSave={save} onClose={() => setEditing(null)} />}

      {maintaining && (
        <MaintenanceDialog
          room={maintaining}
          onClose={() => setMaintaining(null)}
          onDone={async (note) => {
            await api.setMaintenance(maintaining.number, true, note);
            const n = maintaining.number;
            setMaintaining(null);
            ok(`Room ${n} is now under maintenance.`);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete room ${deleting.number}?`}
          confirmLabel="Delete room"
          cancelLabel="Keep room"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.deleteRoom(deleting.number);
            const n = deleting.number;
            setDeleting(null);
            ok(`Room ${n} was deleted.`);
          }}
        >
          <p>
            This removes {deleting.type} room {deleting.number} from the hotel. Past bookings for this room stay in
            the records. A room with active bookings cannot be deleted.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
