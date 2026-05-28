"use client";

import { useEffect, useState, type CSSProperties } from "react";

export type TourStep = {
  /** CSS selector for the highlight target. Omit to show a centered callout
   *  with no spotlight (welcome / closing screen). */
  selector?: string;
  title: string;
  body: string;
  /** Optional action that runs when the user advances *into* this step.
   *  Useful for opening a sheet first so the highlight target exists. */
  before?: () => void | Promise<void>;
};

const SPOT_PAD = 8;
const CALLOUT_W = 320;
const CALLOUT_W_MOBILE = 280;
const MARGIN = 16;
const CALLOUT_GAP = 14;

/** Compute the absolute position for the callout relative to a target. */
function placeCallout(rect: DOMRect | null, calloutH: number, isMobile: boolean): CSSProperties {
  const W = isMobile ? CALLOUT_W_MOBILE : CALLOUT_W;
  if (!rect) {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: W,
    };
  }
  let top: number;
  if (rect.bottom + CALLOUT_GAP + calloutH + MARGIN < window.innerHeight) {
    top = rect.bottom + CALLOUT_GAP;
  } else if (rect.top - CALLOUT_GAP - calloutH - MARGIN > 0) {
    top = rect.top - CALLOUT_GAP - calloutH;
  } else {
    top = Math.max(MARGIN, window.innerHeight / 2 - calloutH / 2);
  }
  let left = rect.left + rect.width / 2 - W / 2;
  if (left < MARGIN) left = MARGIN;
  if (left + W > window.innerWidth - MARGIN) left = window.innerWidth - W - MARGIN;
  return { position: "fixed", top, left, width: W };
}

export function Tour({
  steps,
  isMobile,
  onClose,
}: {
  steps: TourStep[];
  isMobile: boolean;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [calloutH, setCalloutH] = useState(180);

  const step = steps[idx];
  const total = steps.length;

  // Run optional `before` action when stepping in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (step.before) await step.before();
      if (cancelled) return;
      // Slight delay so any opening sheet finishes its slide-in.
      setTimeout(() => measure(), 60);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Re-measure target on resize / scroll / layout change.
  useEffect(() => {
    measure();
    const onResize = () => measure();
    const id = setInterval(measure, 350);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function measure() {
    if (!step.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);
    // Auto-scroll into view if obscured.
    if (r.top < 60 || r.bottom > window.innerHeight - 60) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Keyboard shortcuts: Esc closes, → advances, ← goes back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function next() {
    if (idx >= total - 1) onClose();
    else setIdx(idx + 1);
  }
  function prev() {
    if (idx > 0) setIdx(idx - 1);
  }

  const spotlightStyle: CSSProperties | null = rect
    ? {
        position: "fixed",
        top: rect.top - SPOT_PAD,
        left: rect.left - SPOT_PAD,
        width: rect.width + 2 * SPOT_PAD,
        height: rect.height + 2 * SPOT_PAD,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
        pointerEvents: "none",
        transition: "top 220ms cubic-bezier(.5,.1,.2,1), left 220ms, width 220ms, height 220ms",
        border: "2px solid var(--accent)",
        zIndex: 301,
      }
    : null;

  const calloutStyle = placeCallout(rect, calloutH, isMobile);

  return (
    <>
      {/* full-screen click absorber (only when no spotlight rect) */}
      {!rect && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 300,
          }}
        />
      )}
      {/* spotlight rect creates dim + cutout via large box-shadow */}
      {rect && spotlightStyle && <div aria-hidden style={spotlightStyle} />}
      {/* a transparent layer above the page to block stray interactions */}
      <div
        aria-hidden
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 299,
          pointerEvents: "auto",
          background: "transparent",
        }}
      />
      <Callout
        title={step.title}
        body={step.body}
        idx={idx}
        total={total}
        style={{ ...calloutStyle, zIndex: 302 }}
        onPrev={idx > 0 ? prev : undefined}
        onNext={next}
        onSkip={onClose}
        nextLabel={idx === total - 1 ? "Done" : "Next"}
        onMeasure={setCalloutH}
      />
    </>
  );
}

function Callout({
  title,
  body,
  idx,
  total,
  style,
  onPrev,
  onNext,
  onSkip,
  nextLabel,
  onMeasure,
}: {
  title: string;
  body: string;
  idx: number;
  total: number;
  style: CSSProperties;
  onPrev?: () => void;
  onNext: () => void;
  onSkip: () => void;
  nextLabel: string;
  onMeasure: (h: number) => void;
}) {
  return (
    <div
      ref={(el) => {
        if (el) onMeasure(el.getBoundingClientRect().height);
      }}
      style={style}
      className="bg-[color:var(--panel)] border border-[color:var(--accent-dim)] rounded-xl shadow-soft p-4 sm:p-5"
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] rounded-full transition-all ${
              i === idx
                ? "w-5 bg-[color:var(--accent)]"
                : i < idx
                ? "w-2 bg-[color:var(--accent-dim)]"
                : "w-2 bg-[color:var(--line)]"
            }`}
          />
        ))}
        <span className="ml-auto font-mono text-[10px] text-[color:var(--ink-4)]">
          {idx + 1} / {total}
        </span>
      </div>
      <h3 className="font-serif italic text-[22px] leading-tight tracking-tight text-[color:var(--ink)] mb-1">
        {title}
        <span className="text-[color:var(--accent)]">.</span>
      </h3>
      <p className="text-[13px] leading-relaxed text-[color:var(--ink-2)] mb-4">{body}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onSkip}
          className="text-[12px] text-[color:var(--ink-3)] hover:text-[color:var(--ink)] py-1.5 px-2 rounded-md"
        >
          Skip
        </button>
        <div className="flex-1" />
        {onPrev && (
          <button
            onClick={onPrev}
            className="text-[12.5px] text-[color:var(--ink-2)] hover:text-[color:var(--ink)] py-1.5 px-3 rounded-md border border-[color:var(--line)] hover:border-[color:var(--ink-4)]"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="text-[12.5px] py-1.5 px-3 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] text-white font-medium"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── step scripts ─── */

export function desktopTour(): TourStep[] {
  return [
    {
      title: "welcome to paintoo",
      body:
        "A small studio for marks. Let's walk through the parts so you know where to find things. Takes about 30 seconds.",
    },
    {
      selector: '[data-tour="tools-section"]',
      title: "pick a tool",
      body:
        "Brush, eraser, fill, eyedropper, shapes, text, hand. Each one has a keyboard shortcut shown in its corner — press B for brush, E for eraser.",
    },
    {
      selector: '[data-tour="brush-section"]',
      title: "shape your brush",
      body:
        "Eight brush kinds — pencil, graphite, ink, marker, watercolor, spray, charcoal, calligraphy. Tune size, opacity, flow, smoothing. [ and ] resize on the fly.",
    },
    {
      selector: '[data-tour="color-section"]',
      title: "choose a color",
      body:
        "Drag the ring to set hue, the square for saturation/value. The + slot saves the current color to your palette; right-click a swatch to remove it.",
    },
    {
      selector: '[data-tour="layers-section"]',
      title: "stack your layers",
      body:
        "Add, duplicate, delete, toggle visibility, adjust opacity. Drag the handle on the left of a row to reorder. Each layer is a separate canvas.",
    },
    {
      selector: ".pt-zoom-widget",
      title: "zoom & pan",
      body:
        "⌘+scroll to zoom. Hold Space to pan. Press 0 to fit, 1 for 100%. The hand tool also pans.",
    },
    {
      selector: '[data-tour="save"]',
      title: "save your work",
      body:
        "Saves to your studio — comes back exactly as you left it. ⌘S works too. ⌘E exports as PNG or JPG.",
    },
    {
      title: "you're ready",
      body:
        "Leave a trace. You can replay this tour anytime from the help icon. Pick a brush and go.",
    },
  ];
}

export function mobileTour(openSheet: (s: "tools" | "color" | "layers" | "more" | null) => void): TourStep[] {
  return [
    {
      title: "welcome to paintoo",
      body: "A small studio for marks. Quick tour so you know where everything is — takes 30 seconds.",
    },
    {
      selector: '[data-tour="m-tools"]',
      title: "tools",
      body:
        "Tap here to pick a tool — brush, eraser, fill, shapes, text. Inside the sheet you'll also find brush kinds and size.",
      before: () => openSheet(null),
    },
    {
      selector: '[data-tour="m-color"]',
      title: "color",
      body: "Tap the color dot to open the picker and palette. The current color is shown right in the bar.",
      before: () => openSheet(null),
    },
    {
      selector: '[data-tour="m-layers"]',
      title: "layers",
      body:
        "Layers live here. Add, duplicate, reorder by dragging the handle, adjust opacity, toggle visibility.",
      before: () => openSheet(null),
    },
    {
      selector: '[data-tour="m-more"]',
      title: "more",
      body:
        "Import an image, export your design, clear a layer, switch theme, find shortcuts — all here.",
      before: () => openSheet(null),
    },
    {
      title: "touch gestures",
      body:
        "Drag with one finger to draw. Pinch with two fingers to zoom and pan around the canvas. Tap a layer thumbnail in the layers sheet to switch to it.",
    },
    {
      selector: '[data-tour="save"]',
      title: "save your work",
      body: "Saves to your studio. Your design comes back exactly as you left it.",
    },
    {
      title: "you're ready",
      body: "Leave a trace. You can replay this tour anytime from the ⋮ menu.",
    },
  ];
}
