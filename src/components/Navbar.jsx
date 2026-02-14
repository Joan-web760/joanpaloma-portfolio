"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const navItems = [
  { type: "link", label: "Home", href: "/#home" },
  {
    type: "dropdown",
    id: "aboutDropdown",
    label: "About",
    href: "/about#about",
    links: [
      { label: "Skills", href: "/#skills" },
      { label: "Experience", href: "/experience#experience" },
      { label: "Certifications", href: "/#certifications" },
      { label: "Resume", href: "/#resume" },
    ],
  },
  {
    type: "dropdown",
    id: "servicesDropdown",
    label: "Services",
    href: "/#services",
    links: [{ label: "Testimonials", href: "/#testimonials" }],
  },
  {
    type: "dropdown",
    id: "portfolioDropdown",
    label: "Portfolio",
    href: "/#portfolio",
    links: [{ label: "Pricing", href: "/#pricing" }],
  },
  { type: "link", label: "Blog", href: "/#blog" },
  { type: "link", label: "Contact", href: "/#contact" },
];

const allLinks = navItems.flatMap((item) => {
  if (item.type !== "dropdown") return [item];
  const parent = item.href ? [{ label: item.label, href: item.href }] : [];
  return [...parent, ...item.links];
});

const mobileLinks = allLinks;

const getAnchor = (href) => {
  if (!href) return "";
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return "";
  return href.slice(hashIndex + 1);
};

const getPath = (href) => {
  if (!href) return "/";
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return href || "/";
  return href.slice(0, hashIndex) || "/";
};

const toActiveHash = (href) => {
  const anchor = getAnchor(href);
  return anchor ? `#${anchor}` : "";
};

const getDefaultActive = (path) => {
  if (!path) return "#home";
  if (path === "/") return "#home";
  const match = allLinks.find((l) => getPath(l.href) === path && getAnchor(l.href));
  return match ? `#${getAnchor(match.href)}` : "#home";
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(() => getDefaultActive(pathname));
  const [scrolled, setScrolled] = useState(false);

  // Brand (from DB)
  const [brand, setBrand] = useState("MyPortfolio");

  const isGroupActive = (links) => links.some((l) => toActiveHash(l.href) === active);

  useEffect(() => {
    setActive(getDefaultActive(pathname));
  }, [pathname]);

  // Load brand from site_settings (public-safe)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem("site_title") : null;
        if (cached && alive) setBrand(cached);

        const { data, error } = await supabase
          .from("site_settings")
          .select("site_title")
          .limit(1)
          .maybeSingle();

        if (error) return;

        const title = data?.site_title?.trim() || "MyPortfolio";
        if (!alive) return;

        setBrand(title);

        try {
          localStorage.setItem("site_title", title);
        } catch (_) {}
      } catch (_) {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Shadow + active section tracking
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);

      const nav = document.getElementById("siteNavbar");
      const navH = nav?.offsetHeight || 72;
      const y = window.scrollY + navH + 24;

      let current = getDefaultActive(pathname);

      for (const link of allLinks) {
        const anchor = getAnchor(link.href);
        if (!anchor) continue;

        const path = getPath(link.href);
        if (path !== pathname) continue;

        const el = document.getElementById(anchor);
        if (!el) continue;

        const top = el.getBoundingClientRect().top + window.scrollY;
        if (y >= top) current = `#${anchor}`;
      }

      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const closeMobileMenu = () => {
    const menu = document.getElementById("mainNavbar");
    if (!menu) return;

    const bs = window.bootstrap;
    if (!bs?.Collapse) return;

    const instance = bs.Collapse.getOrCreateInstance(menu, { toggle: false });
    instance.hide();
  };

  const closeDropdowns = () => {
    const bs = window.bootstrap;
    if (!bs?.Dropdown) return;

    navItems
      .filter((item) => item.type === "dropdown")
      .forEach((item) => {
        const toggle = document.getElementById(item.id);
        if (!toggle) return;
        const instance = bs.Dropdown.getOrCreateInstance(toggle);
        instance.hide();
      });
  };

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    if (!href) {
      closeDropdowns();
      closeMobileMenu();
      return;
    }

    const anchor = getAnchor(href);
    const targetPath = getPath(href);

    if (anchor && targetPath === pathname) {
      const nav = document.getElementById("siteNavbar");
      const navH = nav?.offsetHeight || 72;

      const el = document.getElementById(anchor);

      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top, behavior: "smooth" });
        setActive(`#${anchor}`);
        closeDropdowns();
        closeMobileMenu();
        return;
      }
    }

    router.push(href);
    if (anchor) setActive(`#${anchor}`);

    // close UI
    closeDropdowns();
    closeMobileMenu();
  };

  return (
    <nav
      id="siteNavbar"
      className={`navbar navbar-expand-lg fixed-top bg-body-tertiary ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="container">
        <a
          className="navbar-brand fw-bold"
          href="/#home"
          onClick={(e) => handleLinkClick(e, "/#home")}
        >
          {brand}
        </a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav ms-auto align-items-lg-center d-none d-lg-flex">
            {navItems.map((item) => {
              if (item.type === "dropdown") {
                const dropdownActive =
                  isGroupActive(item.links) || (item.href && toActiveHash(item.href) === active);
                const parentActive = item.href && toActiveHash(item.href) === active;
                return (
                  <li className="nav-item dropdown d-flex align-items-center gap-1" key={item.id}>
                    <a
                      className={`nav-link ${parentActive ? "active" : ""}`}
                      href={item.href || "#"}
                      aria-current={parentActive ? "page" : undefined}
                      onClick={(e) => handleLinkClick(e, item.href)}
                    >
                      {item.label}
                    </a>
                    <a
                      id={item.id}
                      className={`nav-link dropdown-toggle dropdown-toggle-split ${
                        dropdownActive ? "active" : ""
                      }`}
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      aria-label={`Toggle ${item.label} menu`}
                      onClick={(e) => e.preventDefault()} // prevent jump to top
                    />

                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby={item.id}>
                      {item.links.map((link) => (
                        <li key={link.href}>
                          <a
                            className={`dropdown-item ${
                              toActiveHash(link.href) === active ? "active" : ""
                            }`}
                            href={link.href}
                            onClick={(e) => handleLinkClick(e, link.href)}
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              const isActive = toActiveHash(item.href) === active;
              return (
                <li className="nav-item" key={item.href}>
                  <a
                    className={`nav-link ${isActive ? "active" : ""}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => handleLinkClick(e, item.href)}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}

            {/* CTA */}
            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
              <a
                className="btn btn-primary btn-sm"
                href="/#contact"
                onClick={(e) => handleLinkClick(e, "/#contact")}
              >
                Let&apos;s talk
              </a>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto align-items-lg-center d-lg-none">
            {mobileLinks.map((link) => {
              const isActive = toActiveHash(link.href) === active;
              return (
                <li className="nav-item" key={link.href}>
                  <a
                    className={`nav-link ${isActive ? "active" : ""}`}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => handleLinkClick(e, link.href)}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}

            {/* CTA */}
            <li className="nav-item mt-2">
              <a
                className="btn btn-primary btn-sm"
                href="/#contact"
                onClick={(e) => handleLinkClick(e, "/#contact")}
              >
                Let&apos;s talk
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
