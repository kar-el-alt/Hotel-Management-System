import { useState } from 'react';
import Modal from './Modal';
import Field from './Field';
import { useForm } from '../utils/hooks';
import { CREATABLE_ROLES } from '../utils/permissions';
import { isValidEmail, nameProblem, passwordProblem, phoneProblem } from '../utils/validation';

const generatePassword = () => `Heritage${Math.floor(1000 + Math.random() * 9000)}`;

// Creates a staff account. The role is fixed at creation and can never be changed.
export default function UserForm({ onSave, onClose }) {
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm(
    { name: '', email: '', phone: '', role: CREATABLE_ROLES[0], password: '' },
    (v) => {
      const e = {};
      const n = nameProblem(v.name);
      if (n) e.name = n;
      if (!isValidEmail(v.email)) e.email = 'Enter a valid email address.';
      const ph = phoneProblem(v.phone);
      if (ph) e.phone = ph;
      const pw = passwordProblem(v.password);
      if (pw) e.password = pw;
      return e;
    }
  );
  const { values, errors, bind, set, touchAll } = form;

  const submit = async (e) => {
    e.preventDefault();
    if (!touchAll()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSave({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        role: values.role,
        password: values.password,
      });
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add a staff account" subtitle="The role cannot be changed after the account is created." onClose={onClose} wide>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field-grid">
          <Field label="Full name" error={errors.name} className="field--wide">
            <input {...bind('name')} autoFocus />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" {...bind('email')} />
          </Field>
          <Field label="Mobile number" error={errors.phone} hint="Example: 0917 123 4567">
            <input inputMode="tel" {...bind('phone')} />
          </Field>
          <Field label="Role" hint="Choose carefully: it is permanent.">
            <select value={values.role} onChange={(e) => set('role', e.target.value)}>
              {CREATABLE_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <div>
            <Field label="Temporary password" error={errors.password} hint="Share it with the staff member.">
              <input {...bind('password')} />
            </Field>
            <button type="button" className="link-button" onClick={() => set('password', generatePassword())}>
              Generate a password
            </button>
          </div>
        </div>

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
