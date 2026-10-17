import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTour } from "./TourContext";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const WalkthroughTour: React.FC = () => {
  const { isActive, currentStep, currentStepIndex, totalSteps, nextStep, prevStep, skipTour } =
    useTour();

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 8;
    const computedRect: Rect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      bottom: rect.bottom + padding,
      right: rect.right + padding,
    };
    setTargetRect(computedRect);

    // Compute tooltip position
    const tooltip = tooltipRef.current;
    const tooltipWidth = tooltip ? tooltip.offsetWidth : 380;
    const tooltipHeight = tooltip ? tooltip.offsetHeight : 220;
    const spacing = 16;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let targetTop = computedRect.bottom + spacing;
    let targetLeft = computedRect.left + computedRect.width / 2 - tooltipWidth / 2;

    const preferred = currentStep.placement || "bottom";

    if (preferred === "top") {
      targetTop = computedRect.top - tooltipHeight - spacing;
      if (targetTop < 16) targetTop = computedRect.bottom + spacing;
    } else if (preferred === "bottom") {
      targetTop = computedRect.bottom + spacing;
      if (targetTop + tooltipHeight > screenHeight - 16) {
        targetTop = Math.max(16, computedRect.top - tooltipHeight - spacing);
      }
    } else if (preferred === "right") {
      targetLeft = computedRect.right + spacing;
      targetTop = computedRect.top + computedRect.height / 2 - tooltipHeight / 2;
      if (targetLeft + tooltipWidth > screenWidth - 16) {
        // Fall back to bottom
        targetLeft = computedRect.left + computedRect.width / 2 - tooltipWidth / 2;
        targetTop = computedRect.bottom + spacing;
      }
    } else if (preferred === "left") {
      targetLeft = computedRect.left - tooltipWidth - spacing;
      targetTop = computedRect.top + computedRect.height / 2 - tooltipHeight / 2;
      if (targetLeft < 16) {
        targetLeft = computedRect.left + computedRect.width / 2 - tooltipWidth / 2;
        targetTop = computedRect.bottom + spacing;
      }
    }

    // Viewport clamping with comfortable mobile margins
    const margin = screenWidth < 640 ? 12 : 16;
    const clampedLeft = Math.max(margin, Math.min(targetLeft, screenWidth - tooltipWidth - margin));
    const clampedTop = Math.max(margin, Math.min(targetTop, screenHeight - tooltipHeight - margin));

    setTooltipPos({ top: clampedTop, left: clampedLeft });
  }, [currentStep]);

  // Scroll into view & track element when step changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    let rafId: number;
    let timerId: any;

    const runScrollAndPosition = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      // Give browser time to start/finish smooth scroll
      timerId = setTimeout(() => {
        updatePosition();
      }, 350);
    };

    runScrollAndPosition();

    const handleScrollOrResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      clearTimeout(timerId);
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isActive, currentStep, updatePosition]);

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto select-none">
      {/* SVG Mask Spotlight Cutout */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White fills everything (opaque) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out the spotlight hole */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={6}
                ry={6}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark backdrop with mask hole */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(10, 14, 18, 0.72)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-default"
          onClick={(e) => {
            // Clicking backdrop advances or stops
            e.stopPropagation();
          }}
        />
      </svg>

      {/* Tactile Highlight Frame around targeted element */}
      {targetRect && (
        <div
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
          className="fixed pointer-events-none z-[9992] transition-all duration-300 ease-out border-2 border-[var(--field-green)] rounded-md shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_0_20px_rgba(24,188,66,0.35)]"
        />
      )}

      {/* Floating Tooltip Card */}
      <div
        ref={tooltipRef}
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
        }}
        className="fixed z-[9995] transition-all duration-200 ease-out w-[calc(100vw-24px)] sm:w-[420px] max-w-[440px] border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] p-4 sm:p-5 md:p-6 shadow-[4px_4px_0px_var(--ink)] sm:shadow-[6px_6px_0px_var(--ink)]"
        role="dialog"
        aria-modal="true"
        aria-label={currentStep.title}
      >
        {/* Top Bar: Step Badge & Close Button */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-[var(--ink)] text-[var(--bg)] font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 uppercase">
              {currentStep.badge || `STEP ${String(currentStepIndex + 1).padStart(2, "0")} / ${String(totalSteps).padStart(2, "0")}`}
            </span>
            <span className="font-mono text-[10px] text-[var(--muted)]">
              {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={skipTour}
            className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-2 -mr-2 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            title="Skip tour (Esc)"
            aria-label="Skip walkthrough tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-2">
          <h3 className="text-lg md:text-xl font-black uppercase tracking-tight leading-tight">
            {currentStep.title}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Step Progression Indicators */}
        <div className="grid grid-cols-5 gap-1.5 py-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 transition-colors duration-200 ${
                i === currentStepIndex
                  ? "bg-[var(--field-green)]"
                  : i < currentStepIndex
                  ? "bg-[var(--ink)]"
                  : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-2">
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted)]">
            <kbd className="border border-[var(--border)] px-1 py-0.5 bg-[var(--bg)]">Esc</kbd>
            <span>skip</span>
            <span className="mx-1">&bull;</span>
            <kbd className="border border-[var(--border)] px-1 py-0.5 bg-[var(--bg)]">&larr;</kbd>
            <kbd className="border border-[var(--border)] px-1 py-0.5 bg-[var(--bg)]">&rarr;</kbd>
            <span>keys</span>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface)] text-[var(--ink)] px-3.5 py-2 min-h-[38px] font-bold text-xs uppercase transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] px-4 py-2 min-h-[38px] font-bold text-xs uppercase transition-colors flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--ink)] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {isLastStep ? (
                <>
                  <span>Got It</span>
                  <Check size={14} />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
