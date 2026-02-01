"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Certifications", href: "#certifications" },
  { label: "Resume", href: "#resume" },
  { label: "Blog", href: "#blog" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [active, setActive] = useState("#home");
  const [scrolled, setScrolled] = useState(false);

  // Brand (from DB)
  const [brand, setBrand] = useState("MyPortfolio");

  // Load brand from site_settings (public-safe)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) fast paint from localStorage (optional)
        const cached = typeof window !== "undefined" ? localStorage.getItem("site_title") : null;
        if (cached && alive) setBrand(cached);

        // 2) fetch latest
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

      for (const link of navLinks) {
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
            {navLinks.map((link) => (
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
