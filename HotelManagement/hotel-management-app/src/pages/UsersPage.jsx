import { useState } from 'react';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import Field from '../components/Field';
import UserForm from '../components/UserForm';
import { api } from '../services/api';
import { useForm, useList, useQueryState } from '../utils/hooks';
import { ROLES } from '../utils/permissions';
import { lengthProblem } from '../utils/validation';
import { formatDateLong, initials, PAGE_SIZE } from '../utils/format';

const roleBadge = {
  Admin: 'badge--res-confirmed',
  'Front Desk': 'badge--res-checked-in',
  Staff: 'badge--available',
  Guest: 'badge--maintenance',
};

// Deactivating an account needs a reason
function DeactivateDialog({ user, onDone, onClose }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useForm({ reason: '' }, (v) => {
    const e = {};
    const p = lengthProblem(v.reason, 5, 200, 'The reason');
    if (p) e.reason = p;
    return e;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.touchAll()) return;
    setBusy(true);
    setError('');
    try {
      await onDone(form.values.reason);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Deactivate ${user.name}?`} subtitle="They will not be able to sign in until the account is reactivated." onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Reason for deactivating" error={form.errors.reason} hint="This note is saved on the account.">
          <textarea rows="3" {...form.bind('reason')} autoFocus />
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
          <button type="submit" className="btn btn--danger" disabled={busy}>
            {busy ? 'Saving...' : 'Deactivate account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// The admin can view accounts, add staff accounts, and deactivate. Accounts cannot be edited,
// and a role can never be changed after the account is created.
export default function UsersPage({ currentUser }) {
  const { query, set } = useQueryState({ search: '', role: 'All', status: 'All' }, PAGE_SIZE);
  const list = useList(api.listUsers, query);
  const [adding, setAdding] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const [notice, setNotice] = useState(null);

  const ok = (text) => {
    setNotice({ type: 'success', text });
    list.reload();
  };

  const reactivate = async (user) => {
    setNotice(null);
    try {
      await api.reactivateUser(user.id);
      ok(`${user.name} was reactivated.`);
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">View accounts, add staff, or deactivate an account. Roles cannot be changed.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setAdding(true)}>
          Add staff account
        </button>
      </div>

      <div className="toolbar">
        <label className="field field--search">
          <span className="field__label">Search</span>
          <input placeholder="Name, email, phone or ID" value={query.search} onChange={(e) => set({ search: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Role</span>
          <select value={query.role} onChange={(e) => set({ role: e.target.value })}>
            <option>All</option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select value={query.status} onChange={(e) => set({ status: e.target.value })}>
            <option>All</option>
            <option>Active</option>
            <option>Deactivated</option>
          </select>
        </label>
      </div>

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
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan="5" className="table__empty">
                  Loading...
                </td>
              </tr>
            )}
            {!list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan="5" className="table__empty">
                  No users match. Clear the search or change a filter.
                </td>
              </tr>
            )}
            {list.items.map((u) => {
              const isSelf = u.email === currentUser.email;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar" aria-hidden="true">
                        {initials(u.name)}
                      </span>
                      <div>
                        <strong>{u.name}</strong>
                        {isSelf && <span className="you-tag">you</span>}
                        <div className="muted">{u.email}</div>
                        <div className="muted">{u.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${roleBadge[u.role]}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge--available' : 'badge--res-cancelled'}`}>
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                    {!u.active && u.deactivationReason && (
                      <div className="muted reason">Reason: {u.deactivationReason}</div>
                    )}
                  </td>
                  <td>{formatDateLong(u.createdAt)}</td>
                  <td className="table__actions">
                    {!isSelf && u.role !== 'Admin' && u.active && (
                      <button className="btn btn--ghost btn--small btn--danger-text" onClick={() => setDeactivating(u)}>
                        Deactivate
                      </button>
                    )}
                    {!isSelf && u.role !== 'Admin' && !u.active && (
                      <button className="btn btn--secondary btn--small" onClick={() => reactivate(u)}>
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={query.page} pageSize={PAGE_SIZE} total={list.total} onPage={(page) => set({ page })} />

      {adding && (
        <UserForm
          onClose={() => setAdding(false)}
          onSave={async (data) => {
            const created = await api.createUser(data);
            setAdding(false);
            ok(`${created.name} was added as ${created.role}.`);
          }}
        />
      )}

      {deactivating && (
        <DeactivateDialog
          user={deactivating}
          onClose={() => setDeactivating(null)}
          onDone={async (reason) => {
            await api.deactivateUser(deactivating.id, reason);
            const name = deactivating.name;
            setDeactivating(null);
            ok(`${name} was deactivated.`);
          }}
        />
      )}
    </>
  );
}
