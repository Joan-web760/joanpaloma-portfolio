export default function HomeHeader({ title, subtitle, align = 'center' }) {
  const alignClass =
    align === 'left' ? 'text-start' : align === 'right' ? 'text-end' : 'text-center';

  return (
    <div className={`mb-4 ${alignClass}`}>
      {title ? <h2 className="h3 mb-2">{title}</h2> : null}
      {subtitle ? <p className="opacity-75 mb-0">{subtitle}</p> : null}
    </div>
  );
}
