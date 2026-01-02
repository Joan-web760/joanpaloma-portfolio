import HomeSection from './HomeSection';

export default function ListColumns({ columns = [] }) {
  if (!columns?.length) return null;

  const col1 = columns.filter((c) => c.column_index === 1);
  const col2 = columns.filter((c) => c.column_index === 2);

  const renderCol = (items) =>
    items.map((col) => {
      const bullets = Array.isArray(col.bullets) ? col.bullets : [];

      return (
        <div className="card bg-dark text-light border-0 mb-3" key={col.id}>
          <div className="card-body">
            <h3 className="h5">{col.heading}</h3>
            {bullets.length ? (
              <ul className="mb-0 opacity-75">
                {bullets.map((b, idx) => (
                  <li key={`${col.id}-${idx}`}>{b}</li>
                ))}
              </ul>
            ) : (
              <div className="opacity-75">No items yet.</div>
            )}
          </div>
        </div>
      );
    });

  return (
    <HomeSection>
      <div className="row g-3">
        <div className="col-lg-6">{renderCol(col1)}</div>
        <div className="col-lg-6">{renderCol(col2)}</div>
      </div>
    </HomeSection>
  );
}
