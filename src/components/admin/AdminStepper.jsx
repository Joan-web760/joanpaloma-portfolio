"use client";

import { Children, isValidElement, useId, useMemo, useState } from "react";

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

  const baseId = useId();

  if (!total) return null;

  const activeIndex = Math.min(Math.max(active, 0), total - 1);

  const goTo = (idx) => {
    const next = Math.min(Math.max(idx, 0), total - 1);
    setActive(next);
  };

  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);
  const activeStep = steps[activeIndex];
  const activeTitle = activeStep?.props?.title || `Step ${activeIndex + 1}`;
  const activeDescription = activeStep?.props?.description || "";

  return (
    <div className={`admin-stepper ${className}`.trim()}>
      <div className="admin-stepper-guide">
        <div>
          <div className="admin-stepper-kicker">You are editing</div>
          <div className="admin-stepper-current">{activeTitle}</div>
          {activeDescription ? <div className="admin-stepper-current-desc">{activeDescription}</div> : null}
        </div>
        <div className="admin-stepper-count">
          {activeIndex + 1} / {total}
        </div>
      </div>

      <div className="admin-stepper-nav" role="tablist" aria-label="Form steps">
        {steps.map((step, idx) => {
          const { title, description } = step.props || {};
          const isActive = idx === activeIndex;
          const isComplete = idx < activeIndex;
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
          const isActive = idx === activeIndex;
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
          <button className="btn btn-outline-secondary" type="button" onClick={goPrev} disabled={activeIndex === 0}>
            <i className="fa-solid fa-arrow-left me-2"></i>Back
          </button>

          <div className="admin-stepper-progress small text-muted">
            Step {activeIndex + 1} of {total}
          </div>

          <button className="btn btn-primary" type="button" onClick={goNext} disabled={activeIndex === total - 1}>
            {activeIndex === total - 1 ? "Last step" : "Next"}
            {activeIndex === total - 1 ? null : <i className="fa-solid fa-arrow-right ms-2"></i>}
          </button>
        </div>
      ) : null}
    </div>
  );
}
