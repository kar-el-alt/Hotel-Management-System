import { useEffect, useState } from 'react';
import Modal from './Modal';
import Field from './Field';
import { api } from '../services/api';
import { useForm } from '../utils/hooks';
import {
  peso,
  today,
  nightsBetween,
  formatDateLong,
  DOWNPAYMENT_RATE,
  CHECK_IN_TIME,
  CHECK_OUT_TIME,
} from '../utils/format';
import { nameProblem, isValidEmail, phoneProblem, referenceProblem } from '../utils/validation';

const blank = (type) => ({ name: '', type });

export default function BookingForm({ room, user, defaults, onClose, onBooked }) {
  const isGuest = user.role === 'Guest';
  const methods = isGuest ? ['GCash', 'Card'] : ['GCash', 'Card', 'Cash'];

  // Start with the number of adults and children chosen in the search
  const startCompanions = [
    ...Array(Math.max(0, (defaults.adults || 1) - 1)).fill(0).map(() => blank('Adult')),
    ...Array(defaults.children || 0).fill(0).map(() => blank('Child')),
  ].slice(0, room.capacity - 1);

  const [step, setStep] = useState('details'); // details | review | done
  const [avail, setAvail] = useState({ available: true, reason: '' });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [booked, setBooked] = useState(null);

  const form = useForm(
    {
      guest: isGuest ? user.name : '',
      email: isGuest ? user.email : '',
      phone: user.role === 'Guest' ? user.phone || '' : '',
      checkIn: defaults.checkIn,
      checkOut: defaults.checkOut,
      companions: startCompanions,
      method: 'GCash',
      reference: '',
    },
    (v) => {
      const e = {};
      if (!isGuest) {
        const n = nameProblem(v.guest, 'guest name');
        if (n) e.guest = n;
        if (!isValidEmail(v.email)) e.email = 'Enter a valid email address.';
      }
      const ph = phoneProblem(v.phone);
      if (ph) e.phone = ph;
      if (v.checkIn < today()) e.checkIn = 'Check-in cannot be in the past.';
      if (v.checkOut <= v.checkIn) e.checkOut = 'Check-out must be after check-in.';
      else if (nightsBetween(v.checkIn, v.checkOut) > 30) e.checkOut = 'Stays are limited to 30 nights.';
      else if (!avail.available)
        e.checkOut =
          avail.reason === 'Booked for these dates' ? 'This room is already booked for these dates.' : avail.reason;
      v.companions.forEach((c, i) => {
        const n = nameProblem(c.name, `name of guest ${i + 2}`);
        if (n) e[`c${i}`] = n;
      });
      if (1 + v.companions.length > room.capacity)
        e.occupants = `This room sleeps up to ${room.capacity} guests.`;
      if (v.method !== 'Cash') {
        const r = referenceProblem(v.reference);
        if (r) e.reference = r;
      }
      return e;
    }
  );
  const { values, errors, bind, setValues, touch, touchAll } = form;

  // Check the room against other bookings whenever the dates change
  useEffect(() => {
    let cancelled = false;
    if (values.checkOut <= values.checkIn || values.checkIn < today()) {
      setAvail({ available: true, reason: '' });
      return undefined;
    }
    api
      .checkRoomAvailability(room.number, { checkIn: values.checkIn, checkOut: values.checkOut })
      .then((a) => {
        if (!cancelled) setAvail(a);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [room.number, values.checkIn, values.checkOut]);

  const nights = values.checkOut > values.checkIn ? nightsBetween(values.checkIn, values.checkOut) : 0;
  const total = nights * room.price;
  const downpayment = Math.round(total * DOWNPAYMENT_RATE);
  const balance = total - downpayment;
  const headcount = 1 + values.companions.length;

  const setCompanion = (i, patch) => {
    setValues((v) => ({
      ...v,
      companions: v.companions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
    touch(`c${i}`);
  };
  const addCompanion = (type) => {
    setValues((v) => ({ ...v, companions: [...v.companions, blank(type)] }));
  };
  const removeCompanion = (i) => {
    setValues((v) => ({ ...v, companions: v.companions.filter((_, idx) => idx !== i) }));
  };

  const goReview = (e) => {
    e.preventDefault();
    setSubmitError('');
    if (touchAll()) setStep('review');
  };

  const confirm = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const reservation = await api.createReservation({
        guest: values.guest.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        roomNumber: room.number,
        checkIn: values.checkIn,
        checkOut: values.checkOut,
        companions: values.companions.map((c) => ({ name: c.name.trim(), type: c.type })),
        payment: { method: values.method, reference: values.reference },
        acceptedTerms: agreed,
      });
      setBooked(reservation);
      setStep('done');
      if (onBooked) onBooked(reservation);
    } catch (err) {
      setSubmitError(err.message);
      setStep('details');
    } finally {
      setSubmitting(false);
    }
  };

  const title = step === 'done' ? 'Booking confirmed' : `Book room ${room.number}`;

  return (
    <Modal title={title} subtitle={`${room.type}, ${peso(room.price)} per night`} onClose={onClose} wide>
      {step !== 'done' && (
        <ol className="steps" aria-label="Booking steps">
          <li className={step === 'details' ? 'is-current' : 'is-done'}>1. Details</li>
          <li className={step === 'review' ? 'is-current' : ''}>2. Review and confirm</li>
        </ol>
      )}

      {step === 'details' && (
        <form className="stack" onSubmit={goReview} noValidate>
          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}

          <fieldset className="group">
            <legend>Stay</legend>
            <div className="field-grid">
              <Field label="Check-in" error={errors.checkIn}>
                <input type="date" min={today()} {...bind('checkIn')} />
              </Field>
              <Field label="Check-out" error={errors.checkOut}>
                <input type="date" min={values.checkIn} {...bind('checkOut')} />
              </Field>
            </div>
            <p className="muted">
              Check-in from {CHECK_IN_TIME}, check-out by {CHECK_OUT_TIME}.
              {nights > 0 && avail.available && !errors.checkOut && (
                <strong className="ok-text"> Room {room.number} is free for these dates.</strong>
              )}
            </p>
          </fieldset>

          <fieldset className="group">
            <legend>Booked by</legend>
            <div className="field-grid">
              <Field label="Full name" error={errors.guest} className="field--wide">
                <input {...bind('guest')} readOnly={isGuest} />
              </Field>
              <Field label="Email" error={errors.email}>
                <input type="email" {...bind('email')} readOnly={isGuest} />
              </Field>
              <Field label="Mobile number" error={errors.phone} hint="Example: 0917 123 4567">
                <input inputMode="tel" {...bind('phone')} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>
              Guests staying ({headcount} of {room.capacity})
            </legend>
            <ul className="occupants">
              <li className="occupant">
                <span className="occupant__name">{values.guest || 'You'}</span>
                <span className="badge badge--maintenance">Adult, booked by</span>
              </li>
              {values.companions.map((c, i) => (
                <li className="occupant" key={i}>
                  <Field label={`Guest ${i + 2} name`} error={errors[`c${i}`]} className="occupant__field">
                    <input
                      value={c.name}
                      onChange={(e) => setCompanion(i, { name: e.target.value })}
                      onBlur={() => touch(`c${i}`)}
                    />
                  </Field>
                  <Field label="Adult or child" className="occupant__type">
                    <select value={c.type} onChange={(e) => setCompanion(i, { type: e.target.value })}>
                      <option>Adult</option>
                      <option>Child</option>
                    </select>
                  </Field>
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => removeCompanion(i)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {errors.occupants && (
              <p className="field__error" role="alert">
                {errors.occupants}
              </p>
            )}
            {headcount < room.capacity && (
              <div className="occupants__add">
                <button type="button" className="btn btn--secondary btn--small" onClick={() => addCompanion('Adult')}>
                  Add an adult
                </button>
                <button type="button" className="btn btn--secondary btn--small" onClick={() => addCompanion('Child')}>
                  Add a child
                </button>
              </div>
            )}
          </fieldset>

          <fieldset className="group">
            <legend>Downpayment</legend>
            <div className="field-grid">
              <Field label="Pay with">
                <select {...bind('method')}>
                  {methods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              {values.method !== 'Cash' ? (
                <Field label="Payment reference number" error={errors.reference} hint="Found in your payment receipt.">
                  <input {...bind('reference')} />
                </Field>
              ) : (
                <p className="muted">The front desk collects the cash downpayment now.</p>
              )}
            </div>
          </fieldset>

          <div className="summary">
            <span>
              {nights} {nights === 1 ? 'night' : 'nights'} x {peso(room.price)} = {peso(total)}
            </span>
            <span>
              Due now (30%): <strong>{peso(downpayment)}</strong>
            </span>
          </div>

          <div className="modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Review booking
            </button>
          </div>
        </form>
      )}

      {step === 'review' && (
        <div className="stack">
          <dl className="meta meta--3">
            <div>
              <dt>Room</dt>
              <dd>
                {room.number}, {room.type}
              </dd>
            </div>
            <div>
              <dt>Stay</dt>
              <dd>
                {formatDateLong(values.checkIn)} to {formatDateLong(values.checkOut)} ({nights}{' '}
                {nights === 1 ? 'night' : 'nights'})
              </dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {values.guest}
                <br />
                {values.email}, {values.phone}
              </dd>
            </div>
          </dl>

          <div>
            <h3>Guests</h3>
            <ul className="plain-list">
              <li>{values.guest} (Adult, booked by)</li>
              {values.companions.map((c, i) => (
                <li key={i}>
                  {c.name} ({c.type})
                </li>
              ))}
            </ul>
          </div>

          <div className="summary summary--stack">
            <span>
              Room total <strong>{peso(total)}</strong>
            </span>
            <span>
              Downpayment now ({values.method}) <strong>{peso(downpayment)}</strong>
            </span>
            <span>
              Balance at check-in <strong>{peso(balance)}</strong>
            </span>
          </div>

          <div className="disclosure" role="note">
            <h3>Non-refundable downpayment</h3>
            <p>
              You are paying <strong>{peso(downpayment)}</strong> now, which is{' '}
              {Math.round(DOWNPAYMENT_RATE * 100)}% of the room total. If you cancel this booking for any
              reason, the downpayment is <strong>not refunded</strong>. The remaining{' '}
              <strong>{peso(balance)}</strong> is paid at check-in.
            </p>
          </div>

          <label className="check check--box">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I understand that the downpayment is non-refundable, and I want to confirm this booking.
          </label>

          <div className="modal__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setStep('details')}>
              Back
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!agreed || submitting}
              onClick={confirm}
            >
              {submitting ? 'Confirming...' : `Confirm and pay ${peso(downpayment)}`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && booked && (
        <div className="stack">
          <p>
            Reservation <strong>{booked.id}</strong> is confirmed for {booked.guest} in room {booked.roomNumber},{' '}
            {formatDateLong(booked.checkIn)} to {formatDateLong(booked.checkOut)}.
          </p>
          <p className="muted">
            Downpayment of {peso(booked.downpayment)} received. Please bring a valid ID at check-in and pay the
            balance of {peso(booked.balance)}.
          </p>
          <div className="modal__actions">
            <button className="btn btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
