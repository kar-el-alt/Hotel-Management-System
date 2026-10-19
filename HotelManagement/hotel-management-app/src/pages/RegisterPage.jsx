import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { api } from '../services/api';
import { useForm } from '../utils/hooks';
import { isValidEmail, nameProblem, passwordProblem, phoneProblem } from '../utils/validation';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({ name: '', email: '', phone: '', password: '', confirm: '' }, (v) => {
    const e = {};
    const n = nameProblem(v.name);
    if (n) e.name = n;
    if (!isValidEmail(v.email)) e.email = 'Enter a valid email address.';
    const ph = phoneProblem(v.phone);
    if (ph) e.phone = ph;
    const pw = passwordProblem(v.password);
    if (pw) e.password = pw;
    if (v.confirm !== v.password) e.confirm = 'Passwords do not match.';
    return e;
  });
  const { values, errors, bind, touchAll } = form;

  const submit = async (e) => {
    e.preventDefault();
    if (!touchAll()) return;
    setSubmitting(true);
    setError('');
    try {
      const account = await api.register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Account created. Sign in to continue.', email: account.email },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form className="login__card" onSubmit={submit} noValidate>
        <div>
          <h1>Create a guest account</h1>
          <p className="muted">Register to book rooms and manage your stays.</p>
        </div>

        <Field label="Full name" error={errors.name}>
          <input autoComplete="name" {...bind('name')} autoFocus />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" {...bind('email')} />
        </Field>
        <Field label="Mobile number" error={errors.phone} hint="Example: 0917 123 4567">
          <input inputMode="tel" autoComplete="tel" {...bind('phone')} />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters with a letter and a number.">
          <input type="password" autoComplete="new-password" {...bind('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <input type="password" autoComplete="new-password" {...bind('confirm')} />
        </Field>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>

        <p className="auth-foot">
          Already have an account?{' '}
          <Link className="auth-link" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
