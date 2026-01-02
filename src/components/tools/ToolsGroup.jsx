import ToolsList from './ToolsList';

export default function ToolsGroup({ group, items = [] }) {
  return (
    <div className="card bg-dark text-light border-0 h-100">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2">
          <i className={group.icon_class || 'fa-solid fa-layer-group'} />
          <h2 className="h5 mb-0">{group.title}</h2>
        </div>

        {group.description ? <p className="opacity-75 mb-3">{group.description}</p> : null}

        <ToolsList items={items} />
      </div>
    </div>
  );
}
