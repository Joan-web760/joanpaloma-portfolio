'use client';

export default function Toggle({ label, checked, onChange, hint }) {
  return (
    <div className="mb-3">
      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={!!checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        {label ? <label className="form-check-label">{label}</label> : null}
      </div>
      {hint ? <div className="small opacity-75 mt-1">{hint}</div> : null}
    </div>
  );
}
