'use client';

export default function Select({ label, value, onChange, options = [], required }) {
  return (
    <div className="mb-3">
      {label ? <label className="form-label">{label}</label> : null}
      <select
        className="form-select"
        value={value ?? ''}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
