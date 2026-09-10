"use client";

import Link from "next/link";

export default function AdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="admin-panel-footer">
      <div className="admin-panel-footer-copy">
        <span>My portfolio</span>
        <span>{year} Website manager.</span>
      </div>

      <div className="admin-panel-footer-links">
        <Link href="/" target="_blank" rel="noreferrer">
          View site
        </Link>
        <Link href="/admin/settings">
          Settings
        </Link>
      </div>
    </footer>
  );
}
