"use client";

import { useEffect, useRef, useState } from "react";
import {
  hexToRgb,
  hslToHsv,
  hslToRgb,
  hsvToHsl,
  rgbToHex,
  type HSL,
} from "@/lib/editorCore";
import { ICONS } from "./icons";
import type { LayerState } from "./CanvasEditor";

type RightPanelProps = {
  color: HSL;
  setColor: (c: HSL) => void;
  setColorFromHex: (hex: string) => void;
  palette: string[];
  setPalette: (p: string[]) => void;
  layers: LayerState[];
  activeId: string | null;
  setActive: (id: string) => void;
  onLayerVisibility: (id: string) => void;
  onLayerRename: (id: string, name: string) => void;
  onLayerOpacity: (id: string, op: number) => void;
  onLayerOpacityCommit: (id: string, oldOp: number, newOp: number) => void;
  onLayerAdd: () => void;
  onLayerDuplicate: () => void;
  onLayerMove: (dir: 1 | -1) => void;
  onLayerReorder: (newIds: string[]) => void;
  onLayerDelete: () => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
  getThumbCanvas: (id: string) => HTMLCanvasElement | undefined;
  /** When true: render as flat content for embedding in a mobile sheet. */
  inSheet?: boolean;
  /** Limit which sections render (mobile sheets show just one). */
  section?: "all" | "color" | "layers";
};

export function RightPanel(props: RightPanelProps) {
  const {
    color,
    setColor,
    setColorFromHex,
    palette,
    setPalette,
    layers,
    activeId,
    setActive,
    onLayerVisibility,
    onLayerRename,
    onLayerOpacity,
    onLayerOpacityCommit,
    onLayerAdd,
    onLayerDuplicate,
    onLayerMove,
    onLayerDelete,
    collapsed,
    setCollapsed,
    getThumbCanvas,
    inSheet,
  } = props;

  if (inSheet) {
    return (
      <div className="flex flex-col pb-4">
        <RightPanelSections {...props} />
      </div>
    );
  }

  return (
    <>
      <aside
        className={`relative z-10 bg-[color:var(--panel)] border-l border-[color:var(--line)] flex flex-col min-h-0 transition-[width] duration-[220ms] ease-out ${
          collapsed ? "w-0 border-0 overflow-hidden" : "w-[280px]"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <RightPanelSections {...props} />
        </div>

        <button
          onClick={() => setCollapsed(true)}
          data-tip="Collapse"
          className="pt-panel-toggle absolute top-3 left-[-14px] w-[14px] h-[56px] bg-[color:var(--panel)] border border-r-0 border-[color:var(--line)] rounded-l-md grid place-items-center cursor-pointer z-[5] text-[color:var(--ink-3)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel-2)] transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 1.5 6.5 4.5 3 7.5" />
          </svg>
        </button>
      </aside>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="pt-reopen-tab absolute top-[18px] right-0 w-[18px] h-[64px] bg-[color:var(--panel)] border border-r-0 border-[color:var(--line)] rounded-l-lg grid place-items-center cursor-pointer text-[color:var(--ink-3)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel-2)] z-[9]"
        >
          <svg width="10" height="10" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 1.5 2.5 4.5 6 7.5" />
          </svg>
        </button>
      )}
    </>
  );
}

function RightPanelSections(props: RightPanelProps) {
  const {
    color,
    setColor,
    setColorFromHex,
    palette,
    setPalette,
    layers,
    activeId,
    setActive,
    onLayerVisibility,
    onLayerRename,
    onLayerOpacity,
    onLayerOpacityCommit,
    onLayerAdd,
    onLayerDuplicate,
    onLayerMove,
    onLayerReorder,
    onLayerDelete,
    getThumbCanvas,
    section = "all",
  } = props;
  const showColor = section === "all" || section === "color";
  const showLayers = section === "all" || section === "layers";
  return (
    <>
      {showColor && (
      <div data-tour="color-section" className="border-b border-[color:var(--line-soft)] px-4 py-3.5">
        <div className="flex justify-between items-center mb-3">
          <div className="font-serif italic text-[17px] text-[color:var(--ink)] tracking-tight">
            Color
          </div>
        </div>
        <ColorPicker color={color} setColor={setColor} setColorFromHex={setColorFromHex} />
        <Palette
          color={color}
          palette={palette}
          setPalette={setPalette}
          setColorFromHex={setColorFromHex}
        />
      </div>
      )}

      {showLayers && (
      <div data-tour="layers-section" className="border-b border-[color:var(--line-soft)] px-4 py-3.5">
        <div className="flex justify-between items-center mb-3">
          <div className="font-serif italic text-[17px] text-[color:var(--ink)] tracking-tight">
            Layers
          </div>
          <span className="text-[10.5px] text-[color:var(--ink-4)] uppercase tracking-wider font-medium">
            {layers.length}
          </span>
        </div>
        <LayerOpacitySlider
          layer={layers.find((l) => l.id === activeId)}
          onChange={onLayerOpacity}
          onCommit={onLayerOpacityCommit}
        />
        <DraggableLayerList
          layers={layers}
          activeId={activeId}
          setActive={setActive}
          onLayerVisibility={onLayerVisibility}
          onLayerRename={onLayerRename}
          onLayerReorder={onLayerReorder}
          getThumbCanvas={getThumbCanvas}
        />

        <div className="flex gap-1 mt-3">
          <LayerActionButton tip="New layer" onClick={onLayerAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </LayerActionButton>
          <LayerActionButton tip="Duplicate" onClick={onLayerDuplicate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </LayerActionButton>
          <LayerActionButton
            tip="Move up"
            onClick={() => onLayerMove(1)}
            disabled={!activeId || layers.findIndex((l) => l.id === activeId) >= layers.length - 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 14 12 8 18 14" />
            </svg>
          </LayerActionButton>
          <LayerActionButton
            tip="Move down"
            onClick={() => onLayerMove(-1)}
            disabled={!activeId || layers.findIndex((l) => l.id === activeId) <= 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 10 12 16 18 10" />
            </svg>
          </LayerActionButton>
          <LayerActionButton tip="Delete" onClick={onLayerDelete} disabled={layers.length <= 1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </LayerActionButton>
        </div>
      </div>
      )}
    </>
  );
}

function ColorPicker({
  color,
  setColor,
  setColorFromHex,
}: {
  color: HSL;
  setColor: (c: HSL) => void;
  setColorFromHex: (hex: string) => void;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const slRef = useRef<HTMLDivElement>(null);

  const [r, g, b] = hslToRgb(color.h, color.s, color.l);
  const hex = rgbToHex(r, g, b);
  const [hr, hg, hb] = hslToRgb(color.h, 1, 0.5);

  // knob positions
  const [ringSize, setRingSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      if (ringRef.current) {
        const rect = ringRef.current.getBoundingClientRect();
        setRingSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cx = ringSize.w / 2,
    cy = ringSize.h / 2;
  const ringRadius = Math.min(ringSize.w, ringSize.h) / 2 - 9;
  const angle = ((color.h - 90) * Math.PI) / 180;
  const hKnob = {
    left: cx + Math.cos(angle) * ringRadius,
    top: cy + Math.sin(angle) * ringRadius,
  };
  const [_h, sv_s, sv_v] = hslToHsv(color.h, color.s, color.l);
  const slBox = slRef.current?.getBoundingClientRect();
  const slKnob = {
    left: sv_s * (slBox?.width || 0),
    top: (1 - sv_v) * (slBox?.height || 0),
  };

  /* drag handlers */
  const dragHueRef = useRef(false);
  const dragSlRef = useRef(false);
  const colorRef = useRef(color);
  useEffect(() => void (colorRef.current = color), [color]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (dragHueRef.current && ringRef.current) {
        const r = ringRef.current.getBoundingClientRect();
        const ccx = r.left + r.width / 2,
          ccy = r.top + r.height / 2;
        const dx = e.clientX - ccx,
          dy = e.clientY - ccy;
        let a = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (a < 0) a += 360;
        setColor({ ...colorRef.current, h: a });
      } else if (dragSlRef.current && slRef.current) {
        const r = slRef.current.getBoundingClientRect();
        const sx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        const sy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        const [, hslS, hslL] = hsvToHsl(colorRef.current.h, sx, 1 - sy);
        setColor({ h: colorRef.current.h, s: hslS, l: hslL });
      }
    }
    function onUp() {
      dragHueRef.current = false;
      dragSlRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setColor]);

  const [hexValue, setHexValue] = useState(hex);
  useEffect(() => setHexValue(hex), [hex]);

  return (
    <>
      <div
        className="relative w-full aspect-square rounded-full grid place-items-center select-none touch-none"
        style={{ touchAction: "none" }}
      >
        <div
          ref={ringRef}
          className="hue-ring absolute inset-0 rounded-full cursor-crosshair"
          onPointerDown={(e) => {
            dragHueRef.current = true;
            e.preventDefault();
            const r = ringRef.current!.getBoundingClientRect();
            const ccx = r.left + r.width / 2,
              ccy = r.top + r.height / 2;
            const dx = e.clientX - ccx,
              dy = e.clientY - ccy;
            let a = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            if (a < 0) a += 360;
            setColor({ ...colorRef.current, h: a });
          }}
        />
        <div
          ref={slRef}
          className="sl-square relative rounded-md cursor-crosshair border border-[color:var(--line)]"
          style={{
            width: "62%",
            height: "62%",
            ["--hue-color" as any]: `rgb(${hr},${hg},${hb})`,
          }}
          onPointerDown={(e) => {
            dragSlRef.current = true;
            e.preventDefault();
            const r = slRef.current!.getBoundingClientRect();
            const sx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            const sy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
            const [, hslS, hslL] = hsvToHsl(colorRef.current.h, sx, 1 - sy);
            setColor({ h: colorRef.current.h, s: hslS, l: hslL });
          }}
        >
          <div
            className="absolute w-3 h-3 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: slKnob.left,
              top: slKnob.top,
              background: hex,
              boxShadow: "0 0 0 1px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.4)",
            }}
          />
        </div>
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: hKnob.left,
            top: hKnob.top,
            boxShadow: "0 0 0 1px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.4)",
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div
          className="w-8 h-8 rounded-md border border-[color:var(--line)] flex-shrink-0 cursor-pointer"
          style={{ background: hex }}
        />
        <input
          value={hexValue}
          onChange={(e) => {
            let v = e.target.value.trim();
            setHexValue(v);
            if (!v.startsWith("#")) v = "#" + v;
            if (hexToRgb(v)) setColorFromHex(v);
          }}
          onBlur={() => setHexValue(hex)}
          maxLength={7}
          className="flex-1 bg-[color:var(--bg)] border border-[color:var(--line)] text-[color:var(--ink)] rounded-md px-2 py-1.5 font-mono text-[12px] tracking-wider uppercase outline-none focus:border-[color:var(--accent)]"
        />
      </div>
    </>
  );
}

function Palette({
  palette,
  setPalette,
  setColorFromHex,
  color,
}: {
  palette: string[];
  setPalette: (p: string[]) => void;
  setColorFromHex: (hex: string) => void;
  color: HSL;
}) {
  const [r, g, b] = hslToRgb(color.h, color.s, color.l);
  const currentHex = rgbToHex(r, g, b);
  return (
    <div className="grid grid-cols-8 gap-1 mt-2.5">
      {palette.map((hex, i) => (
        <div
          key={i + hex}
          onClick={() => setColorFromHex(hex)}
          onContextMenu={(e) => {
            e.preventDefault();
            const next = palette.slice();
            next.splice(i, 1);
            setPalette(next);
          }}
          title={hex}
          className="aspect-square rounded-[4px] border border-[color:var(--line-soft)] cursor-pointer hover:scale-110 hover:border-[color:var(--ink-3)] transition-all relative"
          style={{ background: hex }}
        />
      ))}
      <div
        onClick={() => {
          const next = palette.slice();
          if (next.length >= 24) next.shift();
          next.push(currentHex);
          setPalette(next);
        }}
        className="aspect-square rounded-[4px] border border-dashed border-[color:var(--line)] grid place-items-center text-[color:var(--ink-4)] cursor-pointer hover:text-[color:var(--ink-3)]"
        title="Save current color"
      >
        +
      </div>
    </div>
  );
}

function LayerOpacitySlider({
  layer,
  onChange,
  onCommit,
}: {
  layer: LayerState | undefined;
  onChange: (id: string, op: number) => void;
  onCommit: (id: string, oldOp: number, newOp: number) => void;
}) {
  const oldOpRef = useRef<number>(layer?.opacity ?? 1);
  if (!layer)
    return (
      <div className="flex flex-col gap-1.5 mt-1">
        <div className="flex justify-between items-baseline text-[11.5px] text-[color:var(--ink-3)]">
          <span>Layer opacity</span>
          <span className="font-mono text-[color:var(--ink)] text-[11px]">100%</span>
        </div>
        <input type="range" className="pt" min={0} max={100} disabled value={100} />
      </div>
    );
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex justify-between items-baseline text-[11.5px] text-[color:var(--ink-3)]">
        <span>Layer opacity</span>
        <span className="font-mono text-[color:var(--ink)] text-[11px]">
          {Math.round(layer.opacity * 100)}%
        </span>
      </div>
      <input
        type="range"
        className="pt"
        min={0}
        max={100}
        value={Math.round(layer.opacity * 100)}
        onMouseDown={() => {
          oldOpRef.current = layer.opacity;
        }}
        onChange={(e) => onChange(layer.id, Number(e.target.value) / 100)}
        onMouseUp={(e) => {
          const newOp = Number((e.target as HTMLInputElement).value) / 100;
          onCommit(layer.id, oldOpRef.current, newOp);
        }}
      />
    </div>
  );
}


function LayerActionButton({
  tip,
  onClick,
  disabled,
  children,
}: {
  tip: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      data-tip={tip}
      onClick={onClick}
      disabled={disabled}
      className="tip-side flex-1 bg-[color:var(--panel-2)] border border-[color:var(--line)] text-[color:var(--ink-2)] rounded-md py-1.5 grid place-items-center cursor-pointer transition-all hover:text-[color:var(--ink)] hover:border-[color:var(--ink-4)] hover:bg-[color:var(--bg)] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────── draggable layer list ─── */

function DraggableLayerList(props: {
  layers: LayerState[];
  activeId: string | null;
  setActive: (id: string) => void;
  onLayerVisibility: (id: string) => void;
  onLayerRename: (id: string, name: string) => void;
  onLayerReorder: (newIds: string[]) => void;
  getThumbCanvas: (id: string) => HTMLCanvasElement | undefined;
}) {
  const {
    layers,
    activeId,
    setActive,
    onLayerVisibility,
    onLayerRename,
    onLayerReorder,
    getThumbCanvas,
  } = props;

  // Visual order is top-down: visualIdx 0 is top of list = last array entry.
  const visual = [...layers].reverse();

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  type DragState = {
    id: string;
    pointerId: number;
    startClientY: number;
    deltaY: number;
    fromVisualIdx: number;
    overVisualIdx: number;
    rowHeight: number;
  };
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  /** Threshold before a click upgrades to a drag (in px). */
  const DRAG_THRESHOLD = 5;

  const beginIfNeeded = (e: PointerEvent | React.PointerEvent, id: string, fromVisualIdx: number, startY: number) => {
    if (dragRef.current) return;
    const row = rowRefs.current.get(id);
    if (!row) return;
    const rowHeight = row.getBoundingClientRect().height + 4; // gap-1 = 4px
    const next: DragState = {
      id,
      pointerId: e.pointerId,
      startClientY: startY,
      deltaY: 0,
      fromVisualIdx,
      overVisualIdx: fromVisualIdx,
      rowHeight,
    };
    setDrag(next);
    dragRef.current = next;
  };

  /** Recompute overVisualIdx based on current pointer position. */
  const updateOver = (clientY: number) => {
    const cur = dragRef.current;
    if (!cur) return;
    const c = containerRef.current;
    if (!c) return;
    // For every visual row position, the midpoint at index i (in current,
    // unmoved layout) is row.top + rowHeight/2. We use the source row's
    // original top + (i - fromVisualIdx) * rowHeight as a stable reference.
    // Simpler: iterate other rows and find the one whose midpoint we cross.
    let target = cur.fromVisualIdx;
    for (let i = 0; i < visual.length; i++) {
      const layer = visual[i];
      if (layer.id === cur.id) continue;
      const el = rowRefs.current.get(layer.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (clientY > mid && i > target) target = i;
      else if (clientY < mid && i < target) target = i;
    }
    if (target !== cur.overVisualIdx) {
      const next = { ...cur, overVisualIdx: target, deltaY: clientY - cur.startClientY };
      setDrag(next);
      dragRef.current = next;
    } else {
      const next = { ...cur, deltaY: clientY - cur.startClientY };
      setDrag(next);
      dragRef.current = next;
    }
  };

  /* commit / cancel on pointer up anywhere */
  useEffect(() => {
    if (!drag) return;
    function onMove(e: PointerEvent) {
      if (!dragRef.current || e.pointerId !== dragRef.current.pointerId) return;
      updateOver(e.clientY);
    }
    function onUp(e: PointerEvent) {
      const cur = dragRef.current;
      if (!cur || e.pointerId !== cur.pointerId) return;
      const from = cur.fromVisualIdx;
      const to = cur.overVisualIdx;
      setDrag(null);
      dragRef.current = null;
      if (from !== to) {
        // Visual order → array order: reverse and remap.
        const visualOrder = visual.map((l) => l.id);
        const [moved] = visualOrder.splice(from, 1);
        visualOrder.splice(to, 0, moved);
        const arrayOrder = [...visualOrder].reverse();
        onLayerReorder(arrayOrder);
      }
    }
    function onCancel() {
      setDrag(null);
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, onLayerReorder]);

  // Compute per-row offsets while dragging: rows between fromIdx and overIdx
  // shift by ±rowHeight to make room for the dragged row.
  const rowOffset = (visualIdx: number, id: string): number => {
    if (!drag || id === drag.id) return 0;
    const { fromVisualIdx, overVisualIdx, rowHeight } = drag;
    if (overVisualIdx >= fromVisualIdx) {
      if (visualIdx > fromVisualIdx && visualIdx <= overVisualIdx) return -rowHeight;
    } else {
      if (visualIdx < fromVisualIdx && visualIdx >= overVisualIdx) return rowHeight;
    }
    return 0;
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-1 mt-2 relative"
      style={{ touchAction: "none" }}
    >
      {visual.map((l, visualIdx) => {
        const isDragging = drag?.id === l.id;
        const offset = isDragging ? drag.deltaY : rowOffset(visualIdx, l.id);
        return (
          <DraggableLayerRow
            key={l.id}
            layer={l}
            active={l.id === activeId}
            onActivate={() => setActive(l.id)}
            onVisibility={() => onLayerVisibility(l.id)}
            onRename={(name) => onLayerRename(l.id, name)}
            thumb={getThumbCanvas(l.id)}
            isDragging={isDragging}
            translateY={offset}
            registerRef={(el) => {
              if (el) rowRefs.current.set(l.id, el);
              else rowRefs.current.delete(l.id);
            }}
            onDragPointerDown={(e) => {
              // Don't start drag if interacting with controls.
              const t = e.target as HTMLElement;
              if (t.closest("button, [contenteditable]")) return;
              const startY = e.clientY;
              const initialId = l.id;
              const initialFrom = visualIdx;
              // Use a movement-threshold gate via a one-shot move listener
              const onMoveStart = (ev: PointerEvent) => {
                if (ev.pointerId !== e.pointerId) return;
                if (Math.abs(ev.clientY - startY) >= DRAG_THRESHOLD) {
                  window.removeEventListener("pointermove", onMoveStart);
                  window.removeEventListener("pointerup", onUpEarly);
                  // Begin drag now
                  beginIfNeeded(ev, initialId, initialFrom, startY);
                  // immediately update so the row jumps under cursor
                  updateOver(ev.clientY);
                }
              };
              const onUpEarly = (ev: PointerEvent) => {
                if (ev.pointerId !== e.pointerId) return;
                window.removeEventListener("pointermove", onMoveStart);
                window.removeEventListener("pointerup", onUpEarly);
              };
              window.addEventListener("pointermove", onMoveStart);
              window.addEventListener("pointerup", onUpEarly);
            }}
          />
        );
      })}
    </div>
  );
}

function DraggableLayerRow({
  layer,
  active,
  onActivate,
  onVisibility,
  onRename,
  thumb,
  isDragging,
  translateY,
  registerRef,
  onDragPointerDown,
}: {
  layer: LayerState;
  active: boolean;
  onActivate: () => void;
  onVisibility: () => void;
  onRename: (name: string) => void;
  thumb: HTMLCanvasElement | undefined;
  isDragging: boolean;
  translateY: number;
  registerRef: (el: HTMLDivElement | null) => void;
  onDragPointerDown: (e: React.PointerEvent) => void;
}) {
  const thumbHostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = thumbHostRef.current;
    if (!host) return;
    host.innerHTML = "";
    if (thumb) {
      thumb.style.width = "100%";
      thumb.style.height = "100%";
      thumb.style.display = "block";
      thumb.style.objectFit = "contain";
      host.appendChild(thumb);
    }
  }, [thumb, layer.id]);

  return (
    <div
      ref={registerRef}
      onClick={onActivate}
      onPointerDown={onDragPointerDown}
      className={`grid items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border transition-[border-color,background,box-shadow] ${
        active
          ? "bg-[color:var(--bg)] border-[color:var(--accent-dim)]"
          : "bg-[color:var(--panel-2)] border-transparent hover:border-[color:var(--line)]"
      } ${isDragging ? "shadow-soft z-10 opacity-95 ring-1 ring-[color:var(--accent-dim)]" : ""}`}
      style={{
        gridTemplateColumns: "16px 22px 36px 1fr auto",
        transform: translateY ? `translateY(${translateY}px)` : undefined,
        transition: isDragging ? "none" : "transform 160ms cubic-bezier(.5,.1,.2,1)",
        userSelect: "none",
      }}
    >
      {/* drag handle */}
      <span
        aria-hidden
        className="text-[color:var(--ink-4)] flex flex-col items-center gap-[2px] -ml-1"
      >
        <span className="w-3 h-[1px] bg-current rounded-full" />
        <span className="w-3 h-[1px] bg-current rounded-full" />
        <span className="w-3 h-[1px] bg-current rounded-full" />
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVisibility();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-5 h-5 grid place-items-center bg-transparent border-0 cursor-pointer ${
          layer.visible ? "text-[color:var(--ink-3)]" : "text-[color:var(--ink-4)] opacity-55"
        } hover:text-[color:var(--ink)]`}
      >
        {layer.visible ? ICONS.eye : ICONS.eyeOff}
      </button>
      <div
        ref={thumbHostRef}
        className="checker-sm w-9 h-7 rounded-[4px] border border-[color:var(--line)] overflow-hidden flex-shrink-0"
      />
      <div
        contentEditable="plaintext-only"
        spellCheck={false}
        suppressContentEditableWarning
        className="text-[12.5px] text-[color:var(--ink)] outline-none border border-transparent px-1 rounded-sm min-w-0 overflow-hidden whitespace-nowrap text-ellipsis focus:bg-[color:var(--panel)] focus:border-[color:var(--accent-dim)]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => onRename(e.currentTarget.textContent || "")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLDivElement).blur();
          }
        }}
      >
        {layer.name}
      </div>
      <div className="font-mono text-[10px] text-[color:var(--ink-3)] w-7 text-right">
        {Math.round(layer.opacity * 100)}
      </div>
    </div>
  );
}
