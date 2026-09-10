"use client";

import { useRef, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminTopNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  function closeMenu() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  return (
    <div className="admin-mobile-nav" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeMenu();
      }
    }}>
      <div className="admin-mobile-bar">
        <span className="admin-mobile-brand"><span className="admin-brand-mark" aria-hidden="true">JP</span>My portfolio</span>
        <button ref={toggleRef} type="button" className="btn btn-outline-secondary" onClick={() => setOpen(!open)}
          aria-controls="admin-mobile-menu" aria-expanded={open}>
          <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"} me-2`} aria-hidden="true" />
          {open ? "Close menu" : "Menu"}
        </button>
      </div>
      <div id="admin-mobile-menu" hidden={!open}>
        {open && <AdminNav showHeader={false} onSelect={closeMenu} />}
      </div>
    </div>
  );
}
