"use client";

import { Children, isValidElement, useId, useMemo, useRef, useState } from "react";

export function AdminStep({ children }) {
  return children;
}

export default function AdminStepper({ children, initialStep = 0, className = "", allowJump = true }) {
  const steps = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);
  const [active, setActive] = useState(initialStep);
  const tabsRef = useRef([]);
  const baseId = useId();
  const total = steps.length;
  if (!total) return null;

  const activeIndex = Math.min(Math.max(active, 0), total - 1);
  const current = steps[activeIndex].props;

  function goTo(index, focusTab = false) {
    const next = Math.min(Math.max(index, 0), total - 1);
    setActive(next);
    if (focusTab) tabsRef.current[next]?.focus();
  }

  function handleKeyDown(event, index) {
    if (!allowJump) return;
    const target = {
      ArrowRight: (index + 1) % total,
      ArrowLeft: (index - 1 + total) % total,
      Home: 0,
      End: total - 1,
    }[event.key];
    if (target !== undefined) {
      event.preventDefault();
      goTo(target, true);
    }
  }

  return (
    <div className={`admin-stepper ${className}`.trim()}>
      {total > 1 && (
        <div className="admin-editor-navigation">
          <p className="admin-editor-hint">{allowJump ? "Choose what you want to edit." : "Use Previous and Next to move through the editor."} Switching sections does not save your changes.</p>
          <div className="admin-stepper-nav" role="tablist" aria-label="Editor sections">
            {steps.map((step, index) => (
              <button key={index} ref={(element) => { tabsRef.current[index] = element; }}
                type="button" role="tab" id={`${baseId}-tab-${index}`}
                aria-controls={`${baseId}-panel-${index}`} aria-selected={index === activeIndex}
                tabIndex={index === activeIndex ? 0 : -1} disabled={!allowJump && index !== activeIndex}
                className={`admin-stepper-item${index === activeIndex ? " active" : ""}`}
                onClick={() => goTo(index)} onKeyDown={(event) => handleKeyDown(event, index)}>
                {step.props.title || `Section ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {current.description && <p className="admin-editor-description">{current.description}</p>}
      <div className="admin-stepper-panels">
        {steps.map((step, index) => (
          <div key={index} id={`${baseId}-panel-${index}`} role={total > 1 ? "tabpanel" : undefined}
            aria-labelledby={total > 1 ? `${baseId}-tab-${index}` : undefined}
            tabIndex={total > 1 ? 0 : undefined}
            className={`admin-stepper-panel${index === activeIndex ? " is-active" : ""}`} hidden={index !== activeIndex}>
            {step.props.children}
          </div>
        ))}
      </div>
      {total > 1 && (
        <div className="admin-stepper-footer">
          <button className="btn btn-outline-secondary" type="button" onClick={() => goTo(activeIndex - 1, true)} disabled={activeIndex === 0}>
            <i className="fa-solid fa-arrow-left me-2" aria-hidden="true" />Previous section
          </button>
          <span className="admin-stepper-progress small text-muted">Section {activeIndex + 1} of {total}</span>
          {activeIndex < total - 1
            ? <button className="btn btn-outline-secondary" type="button" onClick={() => goTo(activeIndex + 1, true)}>
                Next section<i className="fa-solid fa-arrow-right ms-2" aria-hidden="true" />
              </button>
            : <span className="admin-editor-save-hint">Use the editor’s save controls to apply changes.</span>}
        </div>
      )}
    </div>
  );
}
