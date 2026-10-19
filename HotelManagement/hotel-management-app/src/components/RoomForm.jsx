import { useState } from 'react';
import Modal from './Modal';
import Field from './Field';
import { useForm } from '../utils/hooks';
import { lengthProblem } from '../utils/validation';
import { ROOM_TYPES, ROOM_TYPE_NAMES } from '../utils/roomTypes';

export default function RoomForm({ room, onSave, onClose }) {
  const editing = Boolean(room);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm(
    {
      number: editing ? String(room.number) : '',
      type: editing ? room.type : ROOM_TYPE_NAMES[0],
      price: editing ? String(room.price) : String(ROOM_TYPES[ROOM_TYPE_NAMES[0]].price),
      capacity: editing ? String(room.capacity) : String(ROOM_TYPES[ROOM_TYPE_NAMES[0]].capacity),
      description: editing ? room.description : ROOM_TYPES[ROOM_TYPE_NAMES[0]].description,
      amenities: editing ? room.amenities.join(', ') : ROOM_TYPES[ROOM_TYPE_NAMES[0]].amenities.join(', '),
    },
    (v) => {
      const e = {};
      if (!editing) {
        const n = Number(v.number);
        if (!/^\d+$/.test(v.number) || n < 1 || n > 9999) e.number = 'Enter a room number from 1 to 9999.';
      }
      const price = Number(v.price);
      if (!/^\d+$/.test(v.price) || price < 500 || price > 100000)
        e.price = 'Enter a whole-number rate from 500 to 100,000.';
      const cap = Number(v.capacity);
      if (!/^\d+$/.test(v.capacity) || cap < 1 || cap > 8) e.capacity = 'Capacity must be from 1 to 8 guests.';
      const d = lengthProblem(v.description, 10, 200, 'The description');
      if (d) e.description = d;
      if (v.amenities.split(',').filter((a) => a.trim()).length < 1) e.amenities = 'List at least one amenity.';
      return e;
    }
  );
  const { values, errors, bind, set, touchAll } = form;

  // Picking a type for a new room fills in that type's usual details
  const changeType = (e) => {
    const type = e.target.value;
    set('type', type);
    if (!editing) {
      const t = ROOM_TYPES[type];
      set('price', String(t.price));
      set('capacity', String(t.capacity));
      set('description', t.description);
      set('amenities', t.amenities.join(', '));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!touchAll()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSave({
        number: values.number,
        type: values.type,
        price: Number(values.price),
        capacity: Number(values.capacity),
        description: values.description.trim(),
        amenities: values.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      });
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal title={editing ? `Edit room ${room.number}` : 'Add a room'} onClose={onClose} wide>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field-grid">
          <Field label="Room number" error={errors.number} hint={editing ? 'The number cannot be changed.' : undefined}>
            <input inputMode="numeric" {...bind('number')} readOnly={editing} autoFocus={!editing} />
          </Field>
          <Field label="Room type">
            <select value={values.type} onChange={changeType}>
              {ROOM_TYPE_NAMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Rate per night (PHP)" error={errors.price}>
            <input inputMode="numeric" {...bind('price')} />
          </Field>
          <Field label="Guest capacity" error={errors.capacity} hint="Adults and children together.">
            <input inputMode="numeric" {...bind('capacity')} />
          </Field>
          <Field label="Description" error={errors.description} className="field--wide">
            <textarea rows="3" {...bind('description')} />
          </Field>
          <Field label="Amenities" error={errors.amenities} hint="Separate with commas." className="field--wide">
            <textarea rows="2" {...bind('amenities')} />
          </Field>
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
            {submitting ? 'Saving...' : editing ? 'Save changes' : 'Add room'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
