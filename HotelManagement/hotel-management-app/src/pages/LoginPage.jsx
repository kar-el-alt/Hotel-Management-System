import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { useForm } from '../utils/hooks';
import { isValidEmail } from '../utils/validation';

const demoAccounts = [
  { label: 'Admin', email: 'admin@heritage.test', password: 'admin123' },
  { label: 'Front Desk', email: 'frontdesk@heritage.test', password: 'frontdesk123' },
  { label: 'Staff', email: 'staff@heritage.test', password: 'staff12345' },
  { label: 'Guest', email: 'maria@example.com', password: 'guest12345' },
];

export default function LoginPage({ onLogin }) {
  const location = useLocation();
  const notice = location.state && location.state.message;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm(
    { email: (location.state && location.state.email) || '', password: '' },
    (v) => {
      const e = {};
      if (!v.email.trim()) e.email = 'Enter your email.';
      else if (!isValidEmail(v.email)) e.email = 'Enter a valid email address.';
      if (!v.password) e.password = 'Enter your password.';
      return e;
    }
  );
  const { values, errors, bind, setValues, touchAll } = form;

  const submit = async (e) => {
    e.preventDefault();
    if (!touchAll()) return;
    setSubmitting(true);
    setError('');
    try {
      await onLogin(values.email, values.password);
      // On success this page is replaced
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form className="login__card" onSubmit={submit} noValidate>
        <div>
          <h1>Sign in</h1>
          <p className="muted">Use your Heritage Hotel account to continue.</p>
        </div>

        {notice && (
          <p className="form-success" role="status">
            {notice}
          </p>
        )}

        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="username" {...bind('email')} autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...bind('password')}
          />
        </Field>

        <div className="auth-row">
          <label className="check">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            Show password
          </label>
          <Link className="auth-link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="auth-foot">
          New here?{' '}
          <Link className="auth-link" to="/register">
            Create a guest account
          </Link>
        </p>

        <div className="demo">
          <p className="demo__title">Demo accounts</p>
          <div className="demo__buttons">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => {
                  setValues({ email: a.email, password: a.password });
                  setError('');
                }}
              >
                Fill in {a.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
