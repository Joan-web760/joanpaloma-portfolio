import AdminCard from '@/components/admin/AdminCard';

export default function StatsCards({ items = [] }) {
  return (
    <div className="row g-3">
      {items.map((it) => (
        <div className="col-sm-6 col-lg-3" key={it.label}>
          <AdminCard>
            <div className="d-flex align-items-center justify-content-between gap-2">
              <div>
                <div className="small opacity-75">{it.label}</div>
                <div className="h3 mb-0">{Number(it.value || 0).toLocaleString()}</div>
              </div>
              <div className="fs-3 opacity-75">
                <i className={it.icon || 'fa-solid fa-chart-simple'} />
              </div>
            </div>
          </AdminCard>
        </div>
      ))}
    </div>
  );
}
