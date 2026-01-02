'use client';

export default function DateInput({ label, value, onChange }) {
  // expects ISO string or empty; stores yyyy-mm-dd for input
  const toDateValue = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fromDateValue = (ymd) => {
    if (!ymd) return null;
    // keep consistent: store as ISO midnight UTC-ish
    const d = new Date(`${ymd}T00:00:00.000Z`);
    return d.toISOString();
  };

  return (
    <div className="mb-3">
      {label ? <label className="form-label">{label}</label> : null}
      <input
        type="date"
        className="form-control"
        value={toDateValue(value)}
        onChange={(e) => onChange?.(fromDateValue(e.target.value))}
      />
    </div>
  );
}
