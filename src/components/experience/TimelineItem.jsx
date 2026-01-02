export default function TimelineItem({ item }) {
  const bullets = Array.isArray(item.bullets) ? item.bullets : [];
  const tags = Array.isArray(item.tags) ? item.tags : [];

  return (
    <div className="card bg-dark text-light border-0">
      <div className="card-body">
        <div className="d-flex justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className={item.icon_class || 'fa-solid fa-briefcase'} />
            <div>
              <div className="fw-semibold">{item.title}</div>
              <div className="small opacity-75">
                {[item.company, item.location].filter(Boolean).join(' • ')}
              </div>
            </div>
          </div>

          <div className="small opacity-75">{item.date_label}</div>
        </div>

        {item.summary ? <p className="opacity-75 mt-3 mb-2">{item.summary}</p> : null}

        {bullets.length ? (
          <ul className="opacity-75 mb-2">
            {bullets.map((b, idx) => (
              <li key={`${item.id}-b-${idx}`}>{b}</li>
            ))}
          </ul>
        ) : null}

        {tags.length ? (
          <div className="d-flex flex-wrap gap-2 mt-2">
            {tags.map((t, idx) => (
              <span key={`${item.id}-t-${idx}`} className="badge text-bg-secondary">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
