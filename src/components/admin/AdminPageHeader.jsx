export default function AdminPageHeader({ title, subtitle, right }) {
  return (
    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h1 className="h4 mb-1">{title}</h1>
        {subtitle ? <div className="opacity-75">{subtitle}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
