"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function PublicAosProvider() {
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    AOS.init({
      once: true,
      duration: 700,
      easing: "ease-out-cubic",
      offset: 72,
      disable: prefersReducedMotion,
    });

    let refreshFrame = 0;
    const refresh = () => {
      if (refreshFrame) {
        window.cancelAnimationFrame(refreshFrame);
      }

      refreshFrame = window.requestAnimationFrame(() => {
        AOS.refreshHard();
      });
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-aos", "src"],
    });

    refresh();

    return () => {
      observer.disconnect();
      if (refreshFrame) {
        window.cancelAnimationFrame(refreshFrame);
      }
    };
  }, []);

  return null;
}
