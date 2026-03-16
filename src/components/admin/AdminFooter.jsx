"use client";

import Link from "next/link";

export default function AdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="admin-panel-footer">
      <div className="admin-panel-footer-copy">
        <span>Admin Studio</span>
        <span>{year} content management workspace.</span>
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
