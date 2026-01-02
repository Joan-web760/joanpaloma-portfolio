'use client';

import { useState } from 'react';

export default function PasswordInput({ label, value, onChange, placeholder, required }) {
  const [show, setShow] = useState(false);

  return (
    <div className="mb-3">
      {label ? <label className="form-label">{label}</label> : null}

      <div className="input-group">
        <input
          type={show ? 'text' : 'password'}
          className="form-control"
          value={value ?? ''}
          placeholder={placeholder}
          required={required}
          onChange={(e) => onChange?.(e.target.value)}
        />
        <button
          className="btn btn-outline-light"
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <i className={`fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
        </button>
      </div>
    </div>
  );
}
