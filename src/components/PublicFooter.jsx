import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "/#home" },
  { label: "Portfolio", href: "/#portfolio" },
  { label: "Services", href: "/#services" },
  { label: "Blog", href: "/#blog" },
  { label: "Contact", href: "/#contact" },
];

const socialMeta = {
  facebook: { label: "Facebook", icon: "fa-facebook-f" },
  linkedin: { label: "LinkedIn", icon: "fa-linkedin-in" },
  github: { label: "GitHub", icon: "fa-github" },
  x: { label: "X", icon: "fa-x-twitter" },
  instagram: { label: "Instagram", icon: "fa-instagram" },
  youtube: { label: "YouTube", icon: "fa-youtube" },
};

export default function PublicFooter({ site, contact }) {
  const year = new Date().getFullYear();
  const siteTitle = site?.site_title?.trim() || "My Portfolio";
  const footerText =
    site?.footer_text?.trim() ||
    site?.site_description?.trim() ||
    "Helping brands and teams turn ideas into polished, practical digital work.";
  const footerTagline =
    site?.footer_tagline?.trim() || "Built for clarity, trust, and momentum.";

  const socials = Object.entries(contact?.socials || {}).filter(([, url]) => Boolean(url));

  return (
    <footer className="public-footer">
      <div className="container public-footer-inner">
        <div className="public-footer-grid">
          <div className="public-footer-brand">
            <div className="public-footer-kicker">Portfolio</div>
            <h2 className="public-footer-title">{siteTitle}</h2>
            <p className="public-footer-copy">{footerText}</p>
          </div>

          <div>
            <div className="public-footer-heading">Explore</div>
            <div className="public-footer-links">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="public-footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="public-footer-heading">Connect</div>
            <div className="public-footer-meta">
              {contact?.public_email ? (
                <a href={`mailto:${contact.public_email}`} className="public-footer-link">
                  {contact.public_email}
                </a>
              ) : null}
              {contact?.phone ? (
                <a href={`tel:${contact.phone}`} className="public-footer-link">
                  {contact.phone}
                </a>
              ) : null}
            </div>

            {socials.length ? (
              <div className="public-footer-socials">
                {socials.map(([key, url]) => {
                  const meta = socialMeta[key] || {
                    label: key,
                    icon: "fa-arrow-up-right-from-square",
                  };

                  return (
                    <a
                      key={key}
                      href={url}
                      className="public-footer-social"
                      target="_blank"
                      rel="noreferrer"
                      aria-label={meta.label}
                    >
                      <i className={`fa-brands ${meta.icon}`} aria-hidden="true"></i>
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="public-footer-bar">
          <span>{year} {siteTitle}. All rights reserved.</span>
          <span>{footerTagline}</span>
        </div>
      </div>
    </footer>
  );
}
