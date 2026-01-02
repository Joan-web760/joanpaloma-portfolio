export default function ToolsCard({ iconClass, label, level }) {
  return (
    <div className="card bg-dark text-light border-0 h-100">
      <div className="card-body d-flex align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          {iconClass ? <i className={iconClass} /> : <i className="fa-solid fa-wrench" />}
          <span className="fw-semibold">{label}</span>
        </div>

        {level ? <span className="badge text-bg-secondary text-uppercase">{level}</span> : null}
      </div>
    </div>
  );
}
