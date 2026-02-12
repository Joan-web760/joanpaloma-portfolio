"use client";

import { useCallback, useEffect, useState } from "react";

const defaultConfirm = {
  title: "Confirm action",
  message: "Are you sure you want to continue?",
  confirmText: "Confirm",
  confirmVariant: "danger",
  cancelText: "Cancel",
};

const defaultSuccess = {
  title: "Success",
  message: "Action completed.",
  confirmText: "OK",
  confirmVariant: "success",
  autoCloseMs: 1400,
};

export function useAdminActionModal() {
  const [modal, setModal] = useState(null);

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        setModal({
          type: "confirm",
          ...defaultConfirm,
          ...options,
          resolve,
        });
      }),
    []
  );

  const success = useCallback((options = {}) => {
    setModal({
      type: "success",
      ...defaultSuccess,
      ...options,
    });
  }, []);

  const onConfirm = useCallback(() => {
    setModal((current) => {
      if (current?.type === "confirm" && typeof current.resolve === "function") {
        current.resolve(true);
      }
      return null;
    });
  }, []);

  const onCancel = useCallback(() => {
    setModal((current) => {
      if (current?.type === "confirm" && typeof current.resolve === "function") {
        current.resolve(false);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!modal || modal.type !== "success" || !modal.autoCloseMs) return;
    const t = window.setTimeout(() => setModal(null), modal.autoCloseMs);
    return () => window.clearTimeout(t);
  }, [modal]);

  return { modal, confirm, success, onConfirm, onCancel };
}

export default function AdminActionModal({ modal, onConfirm, onCancel }) {
  useEffect(() => {
    if (!modal) return;

    const handleKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (modal.type === "confirm") onCancel();
      else onConfirm();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKey);
    };
  }, [modal, onCancel, onConfirm]);

  if (!modal) return null;

  const isConfirm = modal.type === "confirm";
  const iconClass = isConfirm ? "fa-circle-question text-primary" : "fa-circle-check text-success";

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminActionModalTitle"
        aria-describedby="adminActionModalDesc"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2" id="adminActionModalTitle">
                <i className={`fa-solid ${iconClass}`}></i>
                {modal.title}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={isConfirm ? onCancel : onConfirm}
              ></button>
            </div>
            <div className="modal-body">
              <p className="mb-0" id="adminActionModalDesc">
                {modal.message}
              </p>
            </div>
            <div className="modal-footer">
              {isConfirm ? (
                <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                  {modal.cancelText || "Cancel"}
                </button>
              ) : null}
              <button
                type="button"
                className={`btn btn-${modal.confirmVariant || (isConfirm ? "danger" : "success")}`}
                onClick={onConfirm}
              >
                {modal.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={isConfirm ? onCancel : onConfirm}></div>
    </>
  );
}
