'use client';

export default function TextArea({ label, value, onChange, rows = 4, placeholder, required }) {
  return (
    <div className="mb-3">
      {label ? <label className="form-label">{label}</label> : null}
      <textarea
        className="form-control"
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
