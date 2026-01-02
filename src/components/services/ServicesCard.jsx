export default function ServicesCard({ title, description, bullets = [], iconClass }) {
  const list = Array.isArray(bullets) ? bullets : [];

  return (
    <div className="card bg-dark text-light border-0 h-100">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2">
          {iconClass ? <i className={iconClass} /> : null}
          <h3 className="h5 mb-0">{title}</h3>
        </div>

        {description ? <p className="opacity-75">{description}</p> : null}

        {list.length ? (
          <ul className="opacity-75 mb-0">
            {list.map((b, idx) => (
              <li key={`${title}-${idx}`}>{b}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
