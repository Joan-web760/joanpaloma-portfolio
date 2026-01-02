'use client';

export default function AdminTable({ columns = [], rows = [], emptyText = 'No records.' }) {
  return (
    <div className="table-responsive">
      <table className="table table-dark table-hover align-middle">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(rows || []).length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4 opacity-75">
                {emptyText}
              </td>
            </tr>
          ) : (
            (rows || []).map((r, idx) => (
              <tr key={r.id || idx}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
