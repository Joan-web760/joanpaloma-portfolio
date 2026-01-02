'use client';

export default function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}) {
  return (
    <div className="mb-3">
      {label ? <label className="form-label">{label}</label> : null}
      <input
        type={type}
        className="form-control"
        value={value ?? ''}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
