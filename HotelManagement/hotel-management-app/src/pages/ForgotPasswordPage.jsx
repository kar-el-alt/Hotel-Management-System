import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { api } from '../services/api';
import { useForm } from '../utils/hooks';
import { isValidEmail, passwordProblem } from '../utils/validation';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // request | reset
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({ email: '', code: '', password: '', confirm: '' }, (v) => {
    const e = {};
    if (!isValidEmail(v.email)) e.email = 'Enter a valid email address.';
    if (step === 'reset') {
      if (!/^\d{6}$/.test(v.code.trim())) e.code = 'Enter the 6-digit code.';
      const pw = passwordProblem(v.password);
      if (pw) e.password = pw;
      if (v.confirm !== v.password) e.confirm = 'Passwords do not match.';
    }
    return e;
  });
  const { values, errors, bind, touchAll } = form;

  const requestCode = async (e) => {
    e.preventDefault();
    if (!touchAll()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.requestPasswordReset(values.email.trim());
      setDemoCode(result.demoCode || '');
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!touchAll()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.resetPassword(values.email.trim(), values.code.trim(), values.password);
      navigate('/login', {
        replace: true,
        state: { message: 'Password updated. Sign in with your new password.', email: values.email.trim() },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {step === 'request' ? (
        <form className="login__card" onSubmit={requestCode} noValidate>
          <div>
            <h1>Forgot your password?</h1>
            <p className="muted">Enter your email and we will send you a 6-digit reset code.</p>
          </div>
          <Field label="Email" error={errors.email}>
            <input type="email" autoComplete="email" {...bind('email')} autoFocus />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset code'}
          </button>
          <p className="auth-foot">
            <Link className="auth-link" to="/login">
              Back to sign in
            </Link>
          </p>
        </form>
      ) : (
        <form className="login__card" onSubmit={resetPassword} noValidate>
          <div>
            <h1>Reset password</h1>
            <p className="muted">
              If an account exists for {values.email.trim()}, a 6-digit code was sent. It expires in 10 minutes.
            </p>
          </div>
          {demoCode && (
            <p className="demo-code" role="status">
              Demo only: this project has no email service, so your code is <strong>{demoCode}</strong>.
            </p>
          )}
          <Field label="Reset code" error={errors.code}>
            <input inputMode="numeric" maxLength={6} autoComplete="one-time-code" {...bind('code')} autoFocus />
          </Field>
          <Field label="New password" error={errors.password} hint="At least 8 characters with a letter and a number.">
            <input type="password" autoComplete="new-password" {...bind('password')} />
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            <input type="password" autoComplete="new-password" {...bind('confirm')} />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update password'}
          </button>
          <p className="auth-foot">
            Wrong email?{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStep('request');
                setError('');
              }}
            >
              Start over
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
