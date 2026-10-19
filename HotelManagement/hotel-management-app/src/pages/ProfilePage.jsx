import { useState } from 'react';
import Field from '../components/Field';
import { api } from '../services/api';
import { useForm } from '../utils/hooks';
import { formatDateLong } from '../utils/format';
import { nameProblem, passwordProblem, phoneProblem } from '../utils/validation';

function Message({ msg }) {
  if (!msg) return null;
  return (
    <p className={msg.type === 'success' ? 'form-success' : 'form-error'} role={msg.type === 'success' ? 'status' : 'alert'}>
      {msg.text}
    </p>
  );
}

export default function ProfilePage({ user, onUserChange }) {
  const [profileMsg, setProfileMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  const details = useForm({ name: user.name || '', phone: user.phone || '' }, (v) => {
    const e = {};
    const n = nameProblem(v.name);
    if (n) e.name = n;
    const ph = phoneProblem(v.phone);
    if (ph) e.phone = ph;
    return e;
  });

  const password = useForm({ current: '', next: '', confirm: '' }, (v) => {
    const e = {};
    if (!v.current) e.current = 'Enter your current password.';
    const pw = passwordProblem(v.next);
    if (pw) e.next = pw;
    if (v.confirm !== v.next) e.confirm = 'Passwords do not match.';
    return e;
  });

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!details.touchAll()) return;
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile({
        name: details.values.name.trim(),
        phone: details.values.phone.trim(),
      });
      onUserChange({ ...user, ...updated });
      setProfileMsg({ type: 'success', text: 'Profile saved.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (!password.touchAll()) return;
    setSavingPw(true);
    try {
      await api.changePassword(password.values.current, password.values.next);
      password.setValues({ current: '', next: '', confirm: '' });
      setPwMsg({ type: 'success', text: 'Password changed.' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My profile</h1>
          <p className="muted">Manage your account details and password.</p>
        </div>
      </div>

      <div className="two-col two-col--top">
        <section className="panel" aria-labelledby="details-title">
          <h2 id="details-title">Account details</h2>
          <form className="stack" onSubmit={saveProfile} noValidate>
            <Field label="Full name" error={details.errors.name}>
              <input {...details.bind('name')} />
            </Field>
            <Field label="Email" hint="Your email is your sign-in name and cannot be changed.">
              <input value={user.email} readOnly />
            </Field>
            <Field label="Mobile number" error={details.errors.phone} hint="Example: 0917 123 4567">
              <input inputMode="tel" {...details.bind('phone')} />
            </Field>
            <dl className="meta">
              <div>
                <dt>Role</dt>
                <dd>
                  <span className="badge badge--res-checked-in">{user.role}</span>
                </dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{user.createdAt ? formatDateLong(user.createdAt) : 'Not available'}</dd>
              </div>
            </dl>
            <Message msg={profileMsg} />
            <button type="submit" className="btn btn--primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="password-title">
          <h2 id="password-title">Change password</h2>
          <form className="stack" onSubmit={changePassword} noValidate>
            <Field label="Current password" error={password.errors.current}>
              <input type="password" autoComplete="current-password" {...password.bind('current')} />
            </Field>
            <Field label="New password" error={password.errors.next} hint="At least 8 characters with a letter and a number.">
              <input type="password" autoComplete="new-password" {...password.bind('next')} />
            </Field>
            <Field label="Confirm new password" error={password.errors.confirm}>
              <input type="password" autoComplete="new-password" {...password.bind('confirm')} />
            </Field>
            <Message msg={pwMsg} />
            <button type="submit" className="btn btn--primary" disabled={savingPw}>
              {savingPw ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
