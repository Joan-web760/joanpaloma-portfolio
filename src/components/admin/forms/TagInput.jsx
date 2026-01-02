'use client';

import { useEffect, useMemo, useState } from 'react';

export default function TagInput({ label, value = [], onChange, placeholder = 'Add tag and press Enter' }) {
  const tags = useMemo(() => (Array.isArray(value) ? value.filter(Boolean) : []), [value]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // keep input clean if parent changes tags
  }, [tags]);

  const add = (raw) => {
    const t = String(raw || '').trim();
    if (!t) return;

    const normalized = t.replace(/\s+/g, ' ');
    if (tags.some((x) => String(x).toLowerCase() === normalized.toLowerCase())) return;

    onChange?.([...tags, normalized]);
    setInput('');
  };

  const remove = (idx) => {
    onChange?.(tags.filter((_, i) => i !== idx));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      remove(tags.length - 1);
    }
  };

  return (
    <div className="mb-3">
      {label ? <div className="form-label">{label}</div> : null}

      <div className="d-flex flex-wrap gap-2 mb-2">
        {tags.map((t, idx) => (
          <span key={`${t}-${idx}`} className="badge text-bg-secondary d-flex align-items-center gap-2">
            {t}
            <button
              type="button"
              className="btn btn-sm btn-link text-light p-0"
              onClick={() => remove(idx)}
              aria-label={`Remove ${t}`}
              style={{ textDecoration: 'none' }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </span>
        ))}
      </div>

      <input
        className="form-control"
        value={input}
        placeholder={placeholder}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className="small opacity-75 mt-2">Tip: Press Enter or comma to add. Backspace removes last tag.</div>
    </div>
  );
}
