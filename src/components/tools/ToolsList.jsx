import ToolsCard from './ToolsCard';

export default function ToolsList({ items = [] }) {
  if (!items.length) return <div className="opacity-75">No items yet.</div>;

  return (
    <div className="row g-2">
      {items.map((it) => (
        <div className="col-sm-6" key={it.id}>
          <ToolsCard iconClass={it.icon_class} label={it.label} level={it.level} />
        </div>
      ))}
    </div>
  );
}
