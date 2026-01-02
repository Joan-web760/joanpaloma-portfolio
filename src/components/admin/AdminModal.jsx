'use client';

export default function AdminModal({ open, title, children, footer, onClose }) {
  if (!open) return null;

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" onMouseDown={onClose}>
        <div className="modal-dialog modal-dialog-centered" role="document" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-content bg-black border border-secondary">
            <div className="modal-header border-secondary">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">{children}</div>

            {footer ? <div className="modal-footer border-secondary">{footer}</div> : null}
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" />
    </>
  );
}
