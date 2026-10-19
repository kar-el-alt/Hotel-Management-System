import { addDays, today, toIsoDate } from '../utils/format';

const presets = [
  { label: 'Today', range: () => [today(), today()] },
  { label: 'Last 7 days', range: () => [addDays(-6), today()] },
  { label: 'Last 30 days', range: () => [addDays(-29), today()] },
  {
    label: 'This month',
    range: () => {
      const d = new Date();
      return [toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1)), today()];
    },
  },
];

// Two date inputs with quick presets and real-time validation
export default function DateRange({ from, to, onChange, labelFrom = 'From', labelTo = 'To' }) {
  const invalid = from && to && to < from;
  return (
    <div className="daterange">
      <label className={`field ${invalid ? 'has-error' : ''}`}>
        <span className="field__label">{labelFrom}</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} />
      </label>
      <label className={`field ${invalid ? 'has-error' : ''}`}>
        <span className="field__label">{labelTo}</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} />
      </label>
      <div className="daterange__presets" role="group" aria-label="Quick ranges">
        {presets.map((p) => (
          <button key={p.label} type="button" className="btn btn--secondary btn--small" onClick={() => onChange(...p.range())}>
            {p.label}
          </button>
        ))}
        {(from || to) && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => onChange('', '')}>
            Clear
          </button>
        )}
      </div>
      {invalid && (
        <span className="field__error daterange__error" role="alert">
          The end date must be on or after the start date.
        </span>
      )}
    </div>
  );
}
