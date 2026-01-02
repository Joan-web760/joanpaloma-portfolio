import Link from 'next/link';
import { isExternalUrl } from '@/lib/routes';

export default function CTAButton({ href, label, className = '' }) {
  if (!href || !label) return null;

  const classes = `btn btn-primary ${className}`.trim();

  if (isExternalUrl(href)) {
    return (
      <a className={classes} href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }

  return (
    <Link className={classes} href={href}>
      {label}
    </Link>
  );
}
