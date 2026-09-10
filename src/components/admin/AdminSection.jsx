"use client";

/**
 * One labelled block of an admin editor page. Replaces the AdminStepper wizard:
 * sections stack vertically and are all visible at once (no steps, no Back/Next).
 *
 * `actions` renders on the right of the section heading (e.g. Reload / Discard
 * on list editors). `id` lets a page link to the section with an anchor.
 * `bare` skips the card wrapper — use it when the section already renders its
 * own card(s) inside.
 */
export default function AdminSection({ title, description, id, actions, bare = false, children }) {
  return (
    <section className="admin-section" id={id}>
      {(title || actions) && (
        <div className="admin-section-head">
          <div>
            {title ? <h2 className="admin-section-title">{title}</h2> : null}
            {description ? <p className="admin-section-desc">{description}</p> : null}
          </div>
          {actions ? <div className="admin-section-actions">{actions}</div> : null}
        </div>
      )}
      {bare ? children : (
        <div className="card">
          <div className="card-body">{children}</div>
        </div>
      )}
    </section>
  );
}
