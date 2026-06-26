"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const navItems = [
  { type: "link", label: "Home", href: "/#home" },
  { type: "link", label: "About", href: "/about#about" },
  { type: "link", label: "Services", href: "/#services" },
  { type: "link", label: "Portfolio", href: "/#portfolio" },
  { type: "link", label: "Experience", href: "/experience#experience" },
  { type: "link", label: "Blog", href: "/#blog" },
  { type: "link", label: "Contact", href: "/#contact" },
  {
    type: "dropdown",
    id: "moreDropdown",
    label: "More",
    links: [
      { label: "Skills", href: "/#skills" },
      { label: "Tools", href: "/tools" },
      { label: "Certifications", href: "/#certifications" },
      { label: "Testimonials", href: "/#testimonials" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
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

const getActiveKey = (href) => {
  if (!href) return "";
  const anchor = getAnchor(href);
  return anchor ? href : getPath(href);
};

const getDefaultActive = (path) => {
  if (!path) return "#home";
  if (path === "/") return "/#home";
  const match = allLinks.find((l) => getPath(l.href) === path);
  return match ? getActiveKey(match.href) : "/#home";
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(() => getDefaultActive(pathname));
  const [scrolled, setScrolled] = useState(false);

  // Brand (from DB)
  const [brand, setBrand] = useState("MyPortfolio");

  const isGroupActive = (links) => links.some((l) => getActiveKey(l.href) === active);

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
        if (y >= top) current = link.href;
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
        setActive(href);
        closeDropdowns();
        closeMobileMenu();
        return;
      }
    }

    router.push(href);
    setActive(getActiveKey(href));

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
        <Link
          className="navbar-brand fw-bold"
          href="/#home"
          onClick={(e) => handleLinkClick(e, "/#home")}
        >
          {brand}
        </Link>

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
                const dropdownActive = isGroupActive(item.links);
                return (
                  <li className="nav-item dropdown" key={item.id}>
                    <button
                      id={item.id}
                      className={`nav-link dropdown-toggle btn btn-link ${
                        dropdownActive ? "active" : ""
                      }`}
                      type="button"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      aria-current={dropdownActive ? "page" : undefined}
                    >
                      {item.label}
                    </button>

                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby={item.id}>
                      {item.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            className={`dropdown-item ${
                              getActiveKey(link.href) === active ? "active" : ""
                            }`}
                            href={link.href}
                            onClick={(e) => handleLinkClick(e, link.href)}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              const isActive = getActiveKey(item.href) === active;
              return (
                <li className="nav-item" key={item.href}>
                  <Link
                    className={`nav-link ${isActive ? "active" : ""}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => handleLinkClick(e, item.href)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}

            {/* CTA */}
            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
              <Link
                className="btn btn-primary btn-sm"
                href="/#contact"
                onClick={(e) => handleLinkClick(e, "/#contact")}
              >
                Hire Joan
              </Link>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto align-items-lg-center d-lg-none">
            {mobileLinks.map((link) => {
              const isActive = getActiveKey(link.href) === active;
              return (
                <li className="nav-item" key={link.href}>
                  <Link
                    className={`nav-link ${isActive ? "active" : ""}`}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => handleLinkClick(e, link.href)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}

            {/* CTA */}
            <li className="nav-item mt-2">
              <Link
                className="btn btn-primary btn-sm"
                href="/#contact"
                onClick={(e) => handleLinkClick(e, "/#contact")}
              >
                Hire Joan
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
