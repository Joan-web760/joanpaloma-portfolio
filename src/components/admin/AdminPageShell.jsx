"use client";

/**
 * Standard frame for every admin editor page.
 *
 * The admin layout (src/app/admin/layout.js) already renders the page title,
 * hint, notification bell and "View website" link. This shell adds the parts
 * that belong to an individual editor: a sticky action bar (save state + a
 * primary Save button + an optional "View this page" link) and one consistent
 * alert area. Pages render their fields as <AdminSection> blocks inside.
 */
export default function AdminPageShell({
  preview,
  previewLabel = "View this page",
  dirty = false,
  saving = false,
  onSave,
  canSave,
  error,
  notice,
  extraActions,
  children,
}) {
  const showSave = typeof onSave === "function";
  const saveDisabled = saving || (canSave != null ? !canSave : !dirty);

  return (
    <div className="admin-page">
      <div className="admin-page-bar">
        <span className="admin-page-bar-state" role="status">
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
              Saving…
            </>
          ) : dirty ? (
            <>
              <i className="fa-solid fa-circle-dot" aria-hidden="true" />
              Unsaved changes
            </>
          ) : showSave ? (
            <>
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              All changes saved
            </>
          ) : null}
        </span>

        <div className="admin-page-bar-actions">
          {extraActions}
          {preview ? (
            <a className="btn btn-outline-secondary" href={preview} target="_blank" rel="noreferrer">
              <i className="fa-solid fa-arrow-up-right-from-square me-2" aria-hidden="true" />
              {previewLabel}
            </a>
          ) : null}
          {showSave ? (
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saveDisabled}>
              <i className="fa-solid fa-floppy-disk me-2" aria-hidden="true" />
              Save
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          <i className="fa-solid fa-triangle-exclamation me-2" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="alert alert-success" role="status">
          <i className="fa-solid fa-circle-check me-2" aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      {children}
    </div>
  );
}
