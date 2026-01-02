export default function AdminCard({ title, children }) {
  return (
    <div className="card bg-dark text-light border-0">
      <div className="card-body">
        {title ? <div className="fw-semibold mb-3">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
