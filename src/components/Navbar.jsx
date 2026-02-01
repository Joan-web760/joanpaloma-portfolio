"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const primaryLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Contact", href: "#contact" },
];

// put the rest here
const dropdownLinks = [
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Certifications", href: "#certifications" },
  { label: "Resume", href: "#resume" },
  { label: "Blog", href: "#blog" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

const allLinks = [...primaryLinks, ...dropdownLinks];

export default function Navbar() {
  const [active, setActive] = useState("#home");
  const [scrolled, setScrolled] = useState(false);

  // Brand (from DB)
  const [brand, setBrand] = useState("MyPortfolio");

  const isDropdownActive = useMemo(
    () => dropdownLinks.some((l) => l.href === active),
    [active]
  );

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

      let current = "#home";

      for (const link of allLinks) {
        const id = link.href.slice(1);
        const el = document.getElementById(id);
        if (!el) continue;

        const top = el.getBoundingClientRect().top + window.scrollY;
        if (y >= top) current = link.href;
      }

      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobileMenu = () => {
    const menu = document.getElementById("mainNavbar");
    if (!menu) return;

    const bs = window.bootstrap;
    if (!bs?.Collapse) return;

    const instance = bs.Collapse.getOrCreateInstance(menu, { toggle: false });
    instance.hide();
  };

  const closeDropdown = () => {
    const toggle = document.getElementById("moreDropdown");
    if (!toggle) return;

    const bs = window.bootstrap;
    if (!bs?.Dropdown) return;

    const instance = bs.Dropdown.getOrCreateInstance(toggle);
    instance.hide();
  };

  const handleLinkClick = (e, href) => {
    e.preventDefault();

    const nav = document.getElementById("siteNavbar");
    const navH = nav?.offsetHeight || 72;

    const id = href.slice(1);
    const el = document.getElementById(id);

    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      window.location.hash = href;
    }

    setActive(href);

    // close UI
    closeDropdown();
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
          href="#home"
          onClick={(e) => handleLinkClick(e, "#home")}
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
          <ul className="navbar-nav ms-auto align-items-lg-center">
            {/* Primary links */}
            {primaryLinks.map((link) => (
              <li className="nav-item" key={link.href}>
                <a
                  className={`nav-link ${active === link.href ? "active" : ""}`}
                  href={link.href}
                  aria-current={active === link.href ? "page" : undefined}
                  onClick={(e) => handleLinkClick(e, link.href)}
                >
                  {link.label}
                </a>
              </li>
            ))}

            {/* Dropdown */}
            <li className="nav-item dropdown">
              <a
                id="moreDropdown"
                className={`nav-link dropdown-toggle ${isDropdownActive ? "active" : ""}`}
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                onClick={(e) => e.preventDefault()} // prevent jump to top
              >
                More
              </a>

              <ul className="dropdown-menu dropdown-menu-end">
                {dropdownLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      className={`dropdown-item ${active === link.href ? "active" : ""}`}
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.href)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </li>

            {/* CTA */}
            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
              <a
                className="btn btn-primary btn-sm"
                href="#contact"
                onClick={(e) => handleLinkClick(e, "#contact")}
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
