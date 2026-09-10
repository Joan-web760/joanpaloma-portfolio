"use client";

import { useId } from "react";

/**
 * Standard "show this on the public website" control. Replaces the mix of
 * "Mark as published" checkboxes and separate Publish / Unpublish buttons.
 * It only edits form state — the change is written when the page's Save runs.
 */
export default function AdminVisibilityToggle({
  checked,
  onChange,
  disabled = false,
  label = "Show on website",
  help = "Turn this on when you're ready for visitors to see it.",
}) {
  const id = useId();

  return (
    <div className="admin-visibility-toggle">
      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id={id}
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={id}>
          {label} <span className="admin-visibility-state">{checked ? "· Shown" : "· Hidden"}</span>
        </label>
      </div>
      {help ? <div className="form-text">{help}</div> : null}
    </div>
  );
}
