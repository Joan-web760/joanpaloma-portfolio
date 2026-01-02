// =========================================
// PUBLIC ROUTES
// =========================================

export const ROUTES = {
  home: '/',
  services: '/services',
  experience: '/experience',
  portfolio: '/portfolio',
  tools: '/tools',
  testimonials: '/testimonials',
  pricing: '/pricing',
  contact: '/contact',
  blog: '/blog',
  faq: '/faq',

  // admin base
  admin: '/admin',
};

// =========================================
// HELPERS
// =========================================

export const isExternalUrl = (href = '') =>
  typeof href === 'string' && /^https?:\/\//i.test(href);

export const isActiveRoute = (pathname = '', href = '') => {
  if (!pathname || !href) return false;
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
};

// =========================================
// ADMIN ROUTES
// =========================================

const ADMIN_BASE = ROUTES.admin;

export const adminRoutes = {
  primary: [
    { label: 'Dashboard', href: ADMIN_BASE },
    { label: 'Home', href: `${ADMIN_BASE}/home` },
    { label: 'Services', href: `${ADMIN_BASE}/services` },
    { label: 'Experience', href: `${ADMIN_BASE}/experience` },
    { label: 'Portfolio', href: `${ADMIN_BASE}/portfolio` },
    { label: 'Tools', href: `${ADMIN_BASE}/tools` },
    { label: 'Testimonials', href: `${ADMIN_BASE}/testimonials` },
    { label: 'Pricing', href: `${ADMIN_BASE}/pricing` },
    { label: 'Blogs', href: `${ADMIN_BASE}/blogs` },
    { label: 'FAQ', href: `${ADMIN_BASE}/faq` },
    { label: 'Settings', href: `${ADMIN_BASE}/settings` },
  ],
};
