export default function ContactHeader({ title, subtitle }) {
  return (
    <div className="text-center mb-4">
      <h1 className="display-6 fw-bold">{title || 'Contact'}</h1>
      {subtitle ? <p className="lead opacity-75 mb-0">{subtitle}</p> : null}
    </div>
  );
}
