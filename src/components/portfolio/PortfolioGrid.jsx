import PortfolioCard from './PortfolioCard';

export default function PortfolioGrid({ items = [], imagesByItem }) {
  if (!items?.length) {
    return <div className="text-center opacity-75">No portfolio items yet.</div>;
  }

  return (
    <div className="row g-3">
      {items.map((item) => (
        <div className="col-md-6 col-lg-4" key={item.id}>
          <PortfolioCard item={item} images={imagesByItem?.get(item.id) || []} />
        </div>
      ))}
    </div>
  );
}
