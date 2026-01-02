'use client';

export default function Repeater({
  label,
  value = [],
  onChange,
  itemLabel = 'Item',
  fields, // optional: [{ key, label, placeholder }]
}) {
  const items = Array.isArray(value) ? value : [];

  const add = () => {
    const next = fields ? { ...fields.reduce((a, f) => ({ ...a, [f.key]: '' }), {}) } : '';
    onChange?.([...items, next]);
  };

  const remove = (idx) => {
    onChange?.(items.filter((_, i) => i !== idx));
  };

  const update = (idx, nextItem) => {
    onChange?.(items.map((it, i) => (i === idx ? nextItem : it)));
  };

  return (
    <div className="mb-3">
      {label ? <div className="form-label">{label}</div> : null}

      <div className="d-flex flex-column gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="card bg-black border border-secondary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="small opacity-75">{itemLabel} #{idx + 1}</div>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(idx)}>
                  Remove
                </button>
              </div>

              {fields ? (
                <div className="row g-2">
                  {fields.map((f) => (
                    <div className="col-md-4" key={f.key}>
                      <label className="form-label">{f.label}</label>
                      <input
                        className="form-control"
                        value={(it?.[f.key] ?? '')}
                        placeholder={f.placeholder}
                        onChange={(e) => update(idx, { ...(it || {}), [f.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <input
                  className="form-control"
                  value={it ?? ''}
                  placeholder="Enter value"
                  onChange={(e) => update(idx, e.target.value)}
                />
              )}
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-outline-light" onClick={add}>
          + Add
        </button>
      </div>
    </div>
  );
}
