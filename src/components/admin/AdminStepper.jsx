"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useState } from "react";

export function AdminStep({ children }) {
  return children;
}

export default function AdminStepper({ children, initialStep = 0, className = "", allowJump = true }) {
  const steps = useMemo(() => {
    return Children.toArray(children).filter((child) => isValidElement(child));
  }, [children]);

  const total = steps.length;
  const [active, setActive] = useState(() => {
    if (!total) return 0;
    return Math.min(Math.max(initialStep, 0), total - 1);
  });

  useEffect(() => {
    if (!total) return;
    setActive((prev) => Math.min(Math.max(prev, 0), total - 1));
  }, [total]);

  const baseId = useId();

  if (!total) return null;

  const goTo = (idx) => {
    const next = Math.min(Math.max(idx, 0), total - 1);
    setActive(next);
  };

  const goPrev = () => goTo(active - 1);
  const goNext = () => goTo(active + 1);

  return (
    <div className={`admin-stepper ${className}`.trim()}>
      <div className="admin-stepper-nav" role="tablist" aria-label="Form steps">
        {steps.map((step, idx) => {
          const { title, description } = step.props || {};
          const isActive = idx === active;
          const isComplete = idx < active;
          const tabId = `${baseId}-tab-${idx}`;
          const panelId = `${baseId}-panel-${idx}`;

          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              id={tabId}
              aria-controls={panelId}
              aria-selected={isActive}
              className={`admin-stepper-item${isActive ? " active" : ""}${isComplete ? " complete" : ""}`}
              onClick={() => (allowJump ? goTo(idx) : null)}
            >
              <span className="admin-stepper-dot">{idx + 1}</span>
              <span className="admin-stepper-label">
                <span className="admin-stepper-title">{title || `Step ${idx + 1}`}</span>
                {description ? <span className="admin-stepper-desc">{description}</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-stepper-panels">
        {steps.map((step, idx) => {
          const isActive = idx === active;
          const tabId = `${baseId}-tab-${idx}`;
          const panelId = `${baseId}-panel-${idx}`;

          return (
            <div
              key={panelId}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              className={`admin-stepper-panel${isActive ? " is-active" : ""}`}
              hidden={!isActive}
            >
              {step.props?.children}
            </div>
          );
        })}
      </div>

      {total > 1 ? (
        <div className="admin-stepper-footer">
          <button className="btn btn-outline-secondary" type="button" onClick={goPrev} disabled={active === 0}>
            <i className="fa-solid fa-arrow-left me-2"></i>Back
          </button>

          <div className="admin-stepper-progress small text-muted">
            Step {active + 1} of {total}
          </div>

          <button className="btn btn-primary" type="button" onClick={goNext} disabled={active === total - 1}>
            {active === total - 1 ? "Done" : "Next"}
            {active === total - 1 ? null : <i className="fa-solid fa-arrow-right ms-2"></i>}
          </button>
        </div>
      ) : null}
    </div>
  );
}
