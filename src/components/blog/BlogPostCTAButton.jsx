import Link from 'next/link';

const isExternalUrl = (href = '') => /^https?:\/\//i.test(href);

export default function BlogPostCTAButton({ href, label, variant = 'primary', className = '' }) {
  if (!href || !label) return null;

  const btnClass = `btn btn-${variant} ${className}`.trim();

  if (isExternalUrl(href)) {
    return (
      <a className={btnClass} href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }

  return (
    <Link className={btnClass} href={href}>
      {label}
    </Link>
  );
}
