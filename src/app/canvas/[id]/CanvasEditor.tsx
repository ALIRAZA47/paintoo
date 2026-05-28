"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  drawBrushSegment,
  floodFill,
  hexToRgb,
  hslToHsv,
  hslToRgb,
  hsvToHsl,
  rgbToHex,
  rgbToHsl,
  type BrushKind,
  type BrushParams,
  type HSL,
  type Point,
} from "@/lib/editorCore";
import { ICONS } from "./icons";
import { TopBar } from "./TopBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { Modals } from "./Modals";
import { useIsMobile } from "@/lib/useIsMobile";
import {
  BottomSheet,
  MobileActionBar,
  MobileTopBar,
  MoreSheet,
  type SheetKind,
} from "./MobileShell";
import { Tour, desktopTour, mobileTour } from "./Tour";

/* ───────────────────────────────────────────────────────── types ─── */

export type ToolId =
  | "brush"
  | "eraser"
  | "bucket"
  | "dropper"
  | "line"
  | "rect"
  | "ellipse"
  | "halfcircle"
  | "triangle"
  | "arrow"
  | "poly"
  | "text"
  | "hand";

/** Shape tools that follow the simple click-drag-release flow (start point
 *  recorded on down, preview while moving, commit on up). */
const DRAG_SHAPES: ReadonlySet<ToolId> = new Set([
  "line",
  "rect",
  "ellipse",
  "halfcircle",
  "triangle",
  "arrow",
]);
function isDragShape(t: ToolId): boolean {
  return DRAG_SHAPES.has(t);
}

export type LayerState = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
};

type Layer = LayerState & {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  thumb: HTMLCanvasElement;
  thumbCtx: CanvasRenderingContext2D;
};

type HistoryItem = {
  label: string;
  undo: () => void;
  redo: () => void;
};

export type DesignInit = {
  id: number;
  name: string;
  width: number;
  height: number;
  bg: string;
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    dataUrl: string | null;
  }>;
  palette: string[] | null;
};

const HIST_CAP = 50;
const DEFAULT_PALETTE = [
  "#1A1A1A",
  "#FFFFFF",
  "#E85D3A",
  "#F4B860",
  "#F2D571",
  "#7BAE7F",
  "#4E89B7",
  "#9C6BB0",
  "#C2B59B",
  "#D9534F",
  "#0D3B66",
  "#3A7D44",
  "#F4D35E",
  "#EE964B",
  "#F95738",
  "#5C415D",
];

/* ───────────────────────────────────────────────────────── component ─── */

export default function CanvasEditor({ design }: { design: DesignInit }) {
  const router = useRouter();

  /* DOM refs */
  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const polyHintRef = useRef<HTMLDivElement>(null);

  /* Layer storage (mutable) */
  const layersRef = useRef<Layer[]>([]);
  const activeIdRef = useRef<string | null>(null);

  /* History */
  const histRef = useRef<HistoryItem[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const histIdxRef = useRef(-1);

  /* View */
  const viewRef = useRef({ zoom: 1, x: 0, y: 0 });
  const [, forceTick] = useState(0);
  const bumpView = () => forceTick((t) => t + 1);
  const [zoomLabel, setZoomLabel] = useState("100%");

  /* UI-driving state */
  const [tool, setTool] = useState<ToolId>("brush");
  const [brushKind, setBrushKindState] = useState<BrushKind>("pencil");
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [brushFlow, setBrushFlow] = useState(1);
  const [brushSmoothing, setBrushSmoothing] = useState(0.35);
  const [shapeFill, setShapeFill] = useState(true);
  const [shapeStroke, setShapeStroke] = useState(true);
  const [shapeWeight, setShapeWeight] = useState(4);
  const [textFont, setTextFont] = useState("Inter Tight");
  const [textSize, setTextSize] = useState(48);
  const [textItalic, setTextItalic] = useState(false);
  const [textBold, setTextBold] = useState(false);

  const [color, setColor] = useState<HSL>({ h: 12, s: 0.75, l: 0.5 });
  const [palette, setPalette] = useState<string[]>(design.palette ?? DEFAULT_PALETTE);

  const [layerVersion, setLayerVersion] = useState(0);
  const [activeId, setActiveIdState] = useState<string | null>(null);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const isMobile = useIsMobile();
  const [sheet, setSheet] = useState<SheetKind>(null);
  /* close any open sheet when switching to desktop layout */
  useEffect(() => {
    if (!isMobile) setSheet(null);
  }, [isMobile]);

  const [tourOpen, setTourOpen] = useState(false);
  function startTour() {
    setModal(null);
    setSheet(null);
    setTimeout(() => setTourOpen(true), 100);
  }

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fileName, setFileName] = useState(design.name);
  const [pos, setPos] = useState<string>("— , —");
  const [modal, setModal] = useState<null | "new" | "export" | "clear" | "welcome" | "help">(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);
  const toastIdRef = useRef(0);

  const [saving, setSaving] = useState(false);

  /* refs that mirror state for closures */
  const toolRef = useRef(tool);
  const brushKindRef = useRef(brushKind);
  const brushRef = useRef({ size: 8, opacity: 1, flow: 1, smoothing: 0.35 });
  const shapeRef = useRef({ fill: true, stroke: true, weight: 4 });
  const textRef = useRef({ font: "Inter Tight", size: 48, italic: false, bold: false });
  const colorRef = useRef<HSL>({ h: 12, s: 0.75, l: 0.5 });

  useEffect(() => void (toolRef.current = tool), [tool]);
  useEffect(() => void (brushKindRef.current = brushKind), [brushKind]);
  useEffect(() => {
    brushRef.current = {
      size: brushSize,
      opacity: brushOpacity,
      flow: brushFlow,
      smoothing: brushSmoothing,
    };
  }, [brushSize, brushOpacity, brushFlow, brushSmoothing]);
  useEffect(() => {
    shapeRef.current = { fill: shapeFill, stroke: shapeStroke, weight: shapeWeight };
  }, [shapeFill, shapeStroke, shapeWeight]);
  useEffect(() => {
    textRef.current = { font: textFont, size: textSize, italic: textItalic, bold: textBold };
  }, [textFont, textSize, textItalic, textBold]);
  useEffect(() => void (colorRef.current = color), [color]);
  useEffect(() => {
    histIdxRef.current = histIdx;
  }, [histIdx]);

  /* current color helpers */
  const currentRgb = useCallback(() => {
    const c = colorRef.current;
    return hslToRgb(c.h, c.s, c.l);
  }, []);
  const currentHex = useCallback(() => {
    const [r, g, b] = currentRgb();
    return rgbToHex(r, g, b);
  }, [currentRgb]);

  /* ───────────── toast ────────────────────────────────── */
  const toast = useCallback((msg: string) => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1500);
  }, []);

  /* ───────────── theme ────────────────────────────────── */
  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? localStorage.getItem("paintoo-theme")
      : null) as "dark" | "light" | null;
    const t = saved || "dark";
    document.documentElement.setAttribute("data-theme", t);
    setTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("paintoo-theme", next);
    } catch {}
    setTheme(next);
    toast(`${next} theme`);
  }, [theme, toast]);

  /* ───────────── status ───────────────────────────────── */
  const updateStatus = useCallback(() => {
    /* triggered by re-renders via state changes */
  }, []);

  /* ───────────── view ─────────────────────────────────── */
  const applyView = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { x, y, zoom } = viewRef.current;
    wrap.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    setZoomLabel(Math.round(zoom * 100) + "%");
  }, []);

  const fitToView = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const pad = 60;
    const z = Math.min(
      (r.width - pad * 2) / design.width,
      (r.height - pad * 2) / design.height,
    );
    viewRef.current.zoom = Math.max(0.05, Math.min(z, 1));
    viewRef.current.x = (r.width - design.width * viewRef.current.zoom) / 2;
    viewRef.current.y = (r.height - design.height * viewRef.current.zoom) / 2;
    applyView();
    bumpView();
  }, [applyView, design.height, design.width]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const old = viewRef.current.zoom;
      const nz = Math.max(0.05, Math.min(32, old * factor));
      const r = vp.getBoundingClientRect();
      const vx = cx - r.left,
        vy = cy - r.top;
      const wx = (vx - viewRef.current.x) / old;
      const wy = (vy - viewRef.current.y) / old;
      viewRef.current.zoom = nz;
      viewRef.current.x = vx - wx * nz;
      viewRef.current.y = vy - wy * nz;
      applyView();
      bumpView();
    },
    [applyView],
  );

  const resetZoom100 = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    viewRef.current.zoom = 1;
    viewRef.current.x = (r.width - design.width) / 2;
    viewRef.current.y = (r.height - design.height) / 2;
    applyView();
    bumpView();
  }, [applyView, design.height, design.width]);

  /* ───────────── coords ───────────────────────────────── */
  const eventToCanvas = useCallback((e: { clientX: number; clientY: number }): Point => {
    const wrap = wrapRef.current!;
    const r = wrap.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / viewRef.current.zoom,
      y: (e.clientY - r.top) / viewRef.current.zoom,
    };
  }, []);

  /* ───────────── layer management ─────────────────────── */
  const mountLayers = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // remove old layer canvases (keep preview)
    wrap.querySelectorAll("canvas.layer-canvas").forEach((n) => n.remove());
    const preview = previewRef.current;
    layersRef.current.forEach((l, i) => {
      l.canvas.style.zIndex = String(i + 1);
      l.canvas.style.opacity = l.visible ? String(l.opacity) : "0";
      if (preview) wrap.insertBefore(l.canvas, preview);
      else wrap.appendChild(l.canvas);
    });
    if (preview) preview.style.zIndex = "9999";
  }, []);

  const updateThumb = useCallback((layer: Layer) => {
    const w = layer.thumb.width,
      h = layer.thumb.height;
    layer.thumbCtx.clearRect(0, 0, w, h);
    layer.thumbCtx.drawImage(layer.canvas, 0, 0, w, h);
  }, []);

  const refreshActiveThumb = useCallback(() => {
    const l = layersRef.current.find((x) => x.id === activeIdRef.current);
    if (l) {
      updateThumb(l);
      setLayerVersion((v) => v + 1);
    }
  }, [updateThumb]);

  const setActive = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveIdState(id);
    setLayerVersion((v) => v + 1);
  }, []);

  const layerIdCounter = useRef(1);
  const makeLayer = useCallback(
    (opts?: { id?: string; name?: string; paintBg?: boolean }): Layer => {
      const w = design.width,
        h = design.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.className = "layer-canvas";
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.imageRendering = "pixelated";
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      if (opts?.paintBg && design.bg !== "transparent") {
        ctx.fillStyle = design.bg;
        ctx.fillRect(0, 0, w, h);
      }
      const thumb = document.createElement("canvas");
      thumb.width = 72;
      thumb.height = 56;
      const thumbCtx = thumb.getContext("2d")!;
      const id =
        opts?.id ||
        "L" + layerIdCounter.current++ + "_" + Math.random().toString(36).slice(2, 7);
      return {
        id,
        name: opts?.name || `Layer ${layersRef.current.length + 1}`,
        visible: true,
        opacity: 1,
        canvas,
        ctx,
        thumb,
        thumbCtx,
      };
    },
    [design.bg, design.height, design.width],
  );

  /* ───────────── history ──────────────────────────────── */
  const pushHistory = useCallback(
    (label: string, undo: () => void, redo: () => void) => {
      histRef.current = histRef.current.slice(0, histIdxRef.current + 1);
      histRef.current.push({ label, undo, redo });
      if (histRef.current.length > HIST_CAP) histRef.current.shift();
      const idx = histRef.current.length - 1;
      histIdxRef.current = idx;
      setHistIdx(idx);
    },
    [],
  );

  const snapLayer = useCallback((layer: Layer): ImageData => {
    return layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
  }, []);
  const restoreLayer = useCallback(
    (layer: Layer, snap: ImageData) => {
      layer.ctx.putImageData(snap, 0, 0);
      updateThumb(layer);
      setLayerVersion((v) => v + 1);
    },
    [updateThumb],
  );

  const undo = useCallback(() => {
    if (histIdxRef.current < 0) return;
    const a = histRef.current[histIdxRef.current];
    a.undo();
    histIdxRef.current--;
    setHistIdx(histIdxRef.current);
    toast(`undo · ${a.label}`);
  }, [toast]);

  const redo = useCallback(() => {
    if (histIdxRef.current >= histRef.current.length - 1) return;
    histIdxRef.current++;
    const a = histRef.current[histIdxRef.current];
    a.redo();
    setHistIdx(histIdxRef.current);
    toast(`redo · ${a.label}`);
  }, [toast]);

  const commitEdit = useCallback(
    (label: string, paintFn: (layer: Layer) => void) => {
      const layer = layersRef.current.find((l) => l.id === activeIdRef.current);
      if (!layer) return;
      const before = snapLayer(layer);
      paintFn(layer);
      const after = snapLayer(layer);
      const id = layer.id;
      pushHistory(
        label,
        () => {
          const l = layersRef.current.find((x) => x.id === id);
          if (l) restoreLayer(l, before);
        },
        () => {
          const l = layersRef.current.find((x) => x.id === id);
          if (l) restoreLayer(l, after);
        },
      );
      updateThumb(layer);
      setLayerVersion((v) => v + 1);
    },
    [pushHistory, restoreLayer, snapLayer, updateThumb],
  );

  /* ───────────── brush cursor ─────────────────────────── */
  const updateBrushCursor = useCallback(() => {
    const c = brushCursorRef.current;
    if (!c) return;
    const sz = brushRef.current.size * viewRef.current.zoom;
    c.style.width = sz + "px";
    c.style.height = sz + "px";
    c.classList.toggle("small", sz < 10);
  }, []);
  useEffect(() => updateBrushCursor(), [brushSize, updateBrushCursor]);

  /* ───────────── drawing engine ───────────────────────── */
  const strokePtsRef = useRef<Point[]>([]);
  const strokeBeforeRef = useRef<ImageData | null>(null);
  const strokeLayerRef = useRef<Layer | null>(null);
  const drawingRef = useRef(false);
  const drawnUpToRef = useRef(0);
  const drawScheduledRef = useRef(false);

  const brushParams = useCallback(
    (overrideKind?: BrushKind): BrushParams => ({
      size: brushRef.current.size,
      opacity: brushRef.current.opacity,
      flow: brushRef.current.flow,
      smoothing: brushRef.current.smoothing,
      kind: overrideKind || brushKindRef.current,
      rgb: currentRgb(),
      erase: toolRef.current === "eraser",
    }),
    [currentRgb],
  );

  const drawStrokeUpTo = useCallback(
    (targetLen: number) => {
      const layer = strokeLayerRef.current;
      if (!layer) return;
      const ctx = layer.ctx;
      const pts = strokePtsRef.current;
      const params = brushParams();
      if (drawnUpToRef.current === 0 && pts.length >= 1) {
        drawBrushSegment(ctx, pts[0], pts[0], params);
        drawnUpToRef.current = 1;
      }
      for (let i = drawnUpToRef.current; i < targetLen; i++) {
        const a = pts[i - 1] || pts[i];
        const b = pts[i];
        drawBrushSegment(ctx, a, b, params);
      }
      drawnUpToRef.current = targetLen;
      if (targetLen === pts.length && !drawingRef.current) drawnUpToRef.current = 0;
    },
    [brushParams],
  );

  const startStroke = useCallback(
    (p: Point) => {
      const layer = layersRef.current.find((l) => l.id === activeIdRef.current);
      if (!layer || !layer.visible) {
        toast("layer is hidden");
        return;
      }
      strokeLayerRef.current = layer;
      strokeBeforeRef.current = snapLayer(layer);
      strokePtsRef.current = [p];
      drawingRef.current = true;
      drawnUpToRef.current = 0;
      drawStrokeUpTo(1);
    },
    [drawStrokeUpTo, snapLayer, toast],
  );

  const moveStroke = useCallback(
    (p: Point) => {
      if (!drawingRef.current) return;
      const pts = strokePtsRef.current;
      const last = pts[pts.length - 1];
      const sm = brushRef.current.smoothing;
      const sp: Point = {
        x: last.x + (p.x - last.x) * (1 - sm),
        y: last.y + (p.y - last.y) * (1 - sm),
        p: p.p,
      };
      pts.push(sp);
      if (!drawScheduledRef.current) {
        drawScheduledRef.current = true;
        requestAnimationFrame(() => {
          drawScheduledRef.current = false;
          drawStrokeUpTo(strokePtsRef.current.length);
        });
      }
    },
    [drawStrokeUpTo],
  );

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawStrokeUpTo(strokePtsRef.current.length);
    drawingRef.current = false;
    const layer = strokeLayerRef.current!;
    const before = strokeBeforeRef.current!;
    const after = snapLayer(layer);
    const id = layer.id;
    const label =
      toolRef.current === "eraser" ? "erase" : `${brushKindRef.current} stroke`;
    pushHistory(
      label,
      () => {
        const l = layersRef.current.find((x) => x.id === id);
        if (l) restoreLayer(l, before);
      },
      () => {
        const l = layersRef.current.find((x) => x.id === id);
        if (l) restoreLayer(l, after);
      },
    );
    updateThumb(layer);
    setLayerVersion((v) => v + 1);
    strokePtsRef.current = [];
    strokeBeforeRef.current = null;
    strokeLayerRef.current = null;
  }, [drawStrokeUpTo, pushHistory, restoreLayer, snapLayer, updateThumb]);

  /* ───────────── shape tools ──────────────────────────── */
  const shapeStartRef = useRef<Point | null>(null);
  const polyPointsRef = useRef<Point[]>([]);

  /** Draw a shape into the given 2D context. Shared by the preview overlay
   *  and the final commit so the two always render identically. */
  const drawShapeTo = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      t: ToolId,
      start: Point,
      end: Point,
      fill: boolean,
      stroke: boolean,
      sw: number,
    ) => {
      const x0 = Math.min(start.x, end.x);
      const x1 = Math.max(start.x, end.x);
      const y0 = Math.min(start.y, end.y);
      const y1 = Math.max(start.y, end.y);
      if (t === "line") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (t === "rect") {
        const w = x1 - x0;
        const h = y1 - y0;
        if (fill) ctx.fillRect(x0, y0, w, h);
        if (stroke) ctx.strokeRect(x0, y0, w, h);
      } else if (t === "ellipse") {
        const cx = (x0 + x1) / 2,
          cy = (y0 + y1) / 2;
        const rx = (x1 - x0) / 2,
          ry = (y1 - y0) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
      } else if (t === "halfcircle") {
        const cx = (x0 + x1) / 2;
        const rx = (x1 - x0) / 2;
        const ry = y1 - y0;
        // D-shape: flat edge at bottom, arc bulges upward.
        ctx.beginPath();
        ctx.ellipse(cx, y1, rx, ry, 0, 0, Math.PI, true);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
      } else if (t === "triangle") {
        ctx.beginPath();
        ctx.moveTo((x0 + x1) / 2, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0, y1);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
      } else if (t === "arrow") {
        const dx = end.x - start.x,
          dy = end.y - start.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) return;
        const angle = Math.atan2(dy, dx);
        const headLen = Math.min(len * 0.3, 30 + sw * 2);
        const headHalf = headLen * 0.45;
        const baseX = end.x - headLen * Math.cos(angle);
        const baseY = end.y - headLen * Math.sin(angle);
        const perpX = -Math.sin(angle);
        const perpY = Math.cos(angle);
        // Shaft (stop just shy of the head so the head sits flat).
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(baseX, baseY);
        ctx.stroke();
        // Filled arrowhead.
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(baseX + perpX * headHalf, baseY + perpY * headHalf);
        ctx.lineTo(baseX - perpX * headHalf, baseY - perpY * headHalf);
        ctx.closePath();
        ctx.fill();
      }
    },
    [],
  );

  const renderShapePreview = useCallback(
    (end: Point | null) => {
      const pv = previewRef.current;
      if (!pv) return;
      const pctx = pv.getContext("2d")!;
      pctx.clearRect(0, 0, pv.width, pv.height);
      const start = shapeStartRef.current;
      const t = toolRef.current;
      if (!start && t !== "poly") return;
      const sw = shapeRef.current.weight;
      const fill = shapeRef.current.fill;
      const stroke = shapeRef.current.stroke;
      const [r, g, b] = currentRgb();
      pctx.strokeStyle = `rgb(${r},${g},${b})`;
      pctx.fillStyle = `rgb(${r},${g},${b})`;
      pctx.lineWidth = sw;
      pctx.lineJoin = "round";
      pctx.lineCap = "round";

      if (start && end && isDragShape(t)) {
        drawShapeTo(pctx, t, start, end, fill, stroke, sw);
      } else if (t === "poly") {
        const pts = polyPointsRef.current;
        if (pts.length === 0) return;
        pctx.beginPath();
        pctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) pctx.lineTo(pts[i].x, pts[i].y);
        if (end) pctx.lineTo(end.x, end.y);
        if (fill) pctx.fill();
        pctx.stroke();
        pctx.fillStyle = "#ffffff";
        pts.forEach((pt) => {
          pctx.beginPath();
          pctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          pctx.fill();
        });
      }
    },
    [currentRgb, drawShapeTo],
  );

  const commitShape = useCallback(
    (end: Point) => {
      const start = shapeStartRef.current;
      if (!start) return;
      const sw = shapeRef.current.weight,
        fill = shapeRef.current.fill,
        stroke = shapeRef.current.stroke;
      const t = toolRef.current;
      const [r, g, b] = currentRgb();
      const color = `rgb(${r},${g},${b})`;
      commitEdit(`${t}`, (layer) => {
        const ctx = layer.ctx;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = sw;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        drawShapeTo(ctx, t, start, end, fill, stroke, sw);
        ctx.restore();
      });
      shapeStartRef.current = null;
      const pv = previewRef.current!;
      pv.getContext("2d")!.clearRect(0, 0, pv.width, pv.height);
    },
    [commitEdit, currentRgb, drawShapeTo],
  );

  const commitPolygon = useCallback(() => {
    const pts = polyPointsRef.current.slice();
    if (pts.length < 3) {
      cancelPolygon();
      return;
    }
    const sw = shapeRef.current.weight,
      fill = shapeRef.current.fill,
      stroke = shapeRef.current.stroke;
    const [r, g, b] = currentRgb();
    const color = `rgb(${r},${g},${b})`;
    commitEdit("polygon", (layer) => {
      const ctx = layer.ctx;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = sw;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      ctx.restore();
    });
    cancelPolygon();
  }, [commitEdit, currentRgb]);

  const cancelPolygon = useCallback(() => {
    polyPointsRef.current = [];
    const pv = previewRef.current;
    if (pv) pv.getContext("2d")!.clearRect(0, 0, pv.width, pv.height);
    polyHintRef.current?.classList.remove("show");
  }, []);

  /* ───────────── bucket fill ──────────────────────────── */
  const doBucketFill = useCallback(
    (p: Point) => {
      const layer = layersRef.current.find((l) => l.id === activeIdRef.current);
      if (!layer || !layer.visible) return;
      const [r, g, b] = currentRgb();
      const alpha = Math.round(brushRef.current.opacity * 255);
      const before = snapLayer(layer);
      floodFill(
        layer.ctx,
        layer.canvas.width,
        layer.canvas.height,
        p.x,
        p.y,
        [r, g, b, alpha],
        16,
      );
      const after = snapLayer(layer);
      const id = layer.id;
      pushHistory(
        "fill",
        () => {
          const l = layersRef.current.find((x) => x.id === id);
          if (l) restoreLayer(l, before);
        },
        () => {
          const l = layersRef.current.find((x) => x.id === id);
          if (l) restoreLayer(l, after);
        },
      );
      updateThumb(layer);
      setLayerVersion((v) => v + 1);
    },
    [currentRgb, pushHistory, restoreLayer, snapLayer, updateThumb],
  );

  /* ───────────── eyedropper ───────────────────────────── */
  const pickColor = useCallback(
    (p: Point) => {
      const x = Math.floor(p.x),
        y = Math.floor(p.y);
      if (x < 0 || y < 0 || x >= design.width || y >= design.height) return;
      let R = 0,
        G = 0,
        B = 0,
        A = 0;
      const ls = layersRef.current;
      for (let i = ls.length - 1; i >= 0; i--) {
        const l = ls[i];
        if (!l.visible) continue;
        const d = l.ctx.getImageData(x, y, 1, 1).data;
        const la = (d[3] / 255) * l.opacity;
        if (la <= 0) continue;
        const remaining = 1 - A;
        const contribute = la * remaining;
        R += d[0] * contribute;
        G += d[1] * contribute;
        B += d[2] * contribute;
        A += contribute;
        if (A >= 0.999) break;
      }
      if (A > 0) {
        const hex = rgbToHex(Math.round(R), Math.round(G), Math.round(B));
        const rgb = hexToRgb(hex)!;
        const [h, s, l] = rgbToHsl(...rgb);
        setColor({ h, s, l });
        toast(`picked ${hex}`);
      } else {
        toast("transparent here");
      }
    },
    [design.height, design.width, toast],
  );

  /* ───────────── text tool ────────────────────────────── */
  const textInputRef = useRef<HTMLDivElement | null>(null);

  const commitTextEdit = useCallback(() => {
    const el = textInputRef.current;
    if (!el) return;
    textInputRef.current = null;
    const text = el.textContent || "";
    const x = parseFloat(el.dataset.x!);
    const y = parseFloat(el.dataset.y!);
    const font = textRef.current.font;
    const size = textRef.current.size;
    const italic = textRef.current.italic;
    const bold = textRef.current.bold;
    const color = currentHex();
    el.remove();
    if (!text.trim()) return;
    commitEdit("text", (layer) => {
      const ctx = layer.ctx;
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `${italic ? "italic " : ""}${bold ? "700 " : ""}${size}px "${font}", sans-serif`;
      ctx.textBaseline = "alphabetic";
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, x, y + i * size * 1.2);
      });
      ctx.restore();
    });
  }, [commitEdit, currentHex]);

  const startTextEdit = useCallback(
    (p: Point) => {
      if (textInputRef.current) commitTextEdit();
      const vp = viewportRef.current;
      if (!vp) return;
      const el = document.createElement("div");
      el.className = "pt-text-edit";
      el.contentEditable = "true";
      el.spellcheck = false;
      Object.assign(el.style, {
        position: "absolute",
        background: "transparent",
        border: "1px dashed var(--accent)",
        color: "var(--ink)",
        padding: "4px",
        outline: "none",
        zIndex: "60",
        minWidth: "40px",
        transformOrigin: "0 0",
        whiteSpace: "pre",
      });
      el.style.left = viewRef.current.x + p.x * viewRef.current.zoom + "px";
      el.style.top =
        viewRef.current.y + (p.y - textRef.current.size) * viewRef.current.zoom + "px";
      el.style.fontFamily = `"${textRef.current.font}", sans-serif`;
      el.style.fontSize = textRef.current.size * viewRef.current.zoom + "px";
      el.style.color = currentHex();
      el.style.fontStyle = textRef.current.italic ? "italic" : "normal";
      el.style.fontWeight = textRef.current.bold ? "700" : "400";
      el.dataset.x = String(p.x);
      el.dataset.y = String(p.y);
      el.textContent = "";
      el.addEventListener("blur", commitTextEdit);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          el.textContent = "";
          el.blur();
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          el.blur();
        }
      });
      vp.appendChild(el);
      textInputRef.current = el;
      setTimeout(() => el.focus(), 0);
    },
    [commitTextEdit, currentHex],
  );

  /* ───────────── pointer pipeline ─────────────────────── */
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const spacePanRef = useRef(false);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<null | {
    startDist: number;
    startCentroid: { x: number; y: number };
    startView: { x: number; y: number; zoom: number };
  }>(null);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    function discardStrokeIfAny() {
      // Roll back any in-progress single-finger stroke so it doesn't get
      // baked into history when the user starts a two-finger gesture.
      if (!drawingRef.current) return;
      const layer = strokeLayerRef.current;
      const before = strokeBeforeRef.current;
      if (layer && before) layer.ctx.putImageData(before, 0, 0);
      drawingRef.current = false;
      strokePtsRef.current = [];
      strokeBeforeRef.current = null;
      strokeLayerRef.current = null;
      drawnUpToRef.current = 0;
    }

    function startGesture() {
      const pts = [...activePointersRef.current.values()];
      if (pts.length < 2) return;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      gestureRef.current = {
        startDist: Math.max(1, Math.hypot(dx, dy)),
        startCentroid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        startView: { ...viewRef.current },
      };
    }

    function onDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          ".pt-zoom-widget, .pt-poly-hint, .pt-panel-toggle, .pt-text-edit, .pt-reopen-tab, .brush-cursor",
        )
      )
        return;

      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger gesture: cancel any single-finger interaction, start pan+zoom.
      if (activePointersRef.current.size >= 2) {
        discardStrokeIfAny();
        cancelPolygon();
        shapeStartRef.current = null;
        panStartRef.current = null;
        startGesture();
        return;
      }

      if (textInputRef.current) {
        commitTextEdit();
        return;
      }
      vp!.setPointerCapture(e.pointerId);

      if (toolRef.current === "hand" || spacePanRef.current || e.button === 1) {
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          vx: viewRef.current.x,
          vy: viewRef.current.y,
        };
        vp!.classList.add("active");
        return;
      }

      const p: Point = { ...eventToCanvas(e), p: e.pressure > 0 ? e.pressure : 0.5 };

      switch (toolRef.current) {
        case "brush":
        case "eraser":
          startStroke(p);
          break;
        case "bucket":
          doBucketFill(p);
          break;
        case "dropper":
          pickColor(p);
          break;
        case "line":
        case "rect":
        case "ellipse":
        case "halfcircle":
        case "triangle":
        case "arrow":
          shapeStartRef.current = p;
          break;
        case "poly":
          if (e.detail === 2 && polyPointsRef.current.length >= 3) {
            commitPolygon();
            return;
          }
          polyPointsRef.current.push(p);
          polyHintRef.current?.classList.add("show");
          renderShapePreview(p);
          break;
        case "text":
          startTextEdit(p);
          break;
      }
    }

    function onMove(e: PointerEvent) {
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Two-finger pan + pinch zoom takes over while gesture is active.
      if (gestureRef.current && activePointersRef.current.size >= 2) {
        const pts = [...activePointersRef.current.values()];
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        const g = gestureRef.current;
        const factor = dist / g.startDist;
        const old = g.startView.zoom;
        const nz = Math.max(0.05, Math.min(32, old * factor));
        const wx = (g.startCentroid.x - g.startView.x) / old;
        const wy = (g.startCentroid.y - g.startView.y) / old;
        viewRef.current.zoom = nz;
        viewRef.current.x = cx - wx * nz;
        viewRef.current.y = cy - wy * nz;
        applyView();
        updateBrushCursor();
        return;
      }

      const c = brushCursorRef.current;
      const r = vp!.getBoundingClientRect();
      if (c) {
        c.style.left = e.clientX - r.left + "px";
        c.style.top = e.clientY - r.top + "px";
      }
      const p = eventToCanvas(e);
      setPos(`${Math.round(p.x)} , ${Math.round(p.y)}`);

      if (panStartRef.current) {
        viewRef.current.x = panStartRef.current.vx + (e.clientX - panStartRef.current.x);
        viewRef.current.y = panStartRef.current.vy + (e.clientY - panStartRef.current.y);
        applyView();
        return;
      }

      if (drawingRef.current) {
        const pp: Point = { ...p, p: e.pressure > 0 ? e.pressure : 0.5 };
        moveStroke(pp);
      } else if (isDragShape(toolRef.current) && shapeStartRef.current) {
        renderShapePreview(p);
      } else if (toolRef.current === "poly" && polyPointsRef.current.length > 0) {
        renderShapePreview(p);
      }
    }

    function onUp(e: PointerEvent) {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) gestureRef.current = null;

      if (panStartRef.current) {
        panStartRef.current = null;
        vp!.classList.remove("active");
        return;
      }
      if (drawingRef.current) {
        endStroke();
        return;
      }
      if (isDragShape(toolRef.current) && shapeStartRef.current) {
        const p = eventToCanvas(e);
        commitShape(p);
      }
    }

    function onCancel(e: PointerEvent) {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) gestureRef.current = null;
    }

    function onLeave() {
      brushCursorRef.current?.classList.add("hidden");
    }
    function onEnter() {
      if (toolRef.current === "brush" || toolRef.current === "eraser")
        brushCursorRef.current?.classList.remove("hidden");
    }

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        zoomAt(factor, e.clientX, e.clientY);
        updateBrushCursor();
      } else {
        e.preventDefault();
        viewRef.current.x -= e.deltaX;
        viewRef.current.y -= e.deltaY;
        applyView();
      }
    }

    function onCtx(e: MouseEvent) {
      e.preventDefault();
    }

    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onCancel);
    vp.addEventListener("pointerleave", onLeave);
    vp.addEventListener("pointerenter", onEnter);
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("contextmenu", onCtx);

    return () => {
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onCancel);
      vp.removeEventListener("pointerleave", onLeave);
      vp.removeEventListener("pointerenter", onEnter);
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("contextmenu", onCtx);
    };
  }, [
    applyView,
    commitPolygon,
    commitShape,
    commitTextEdit,
    doBucketFill,
    endStroke,
    eventToCanvas,
    moveStroke,
    pickColor,
    renderShapePreview,
    startStroke,
    startTextEdit,
    updateBrushCursor,
    zoomAt,
  ]);

  /* ───────────── keyboard ─────────────────────────────── */
  const setToolWithReset = useCallback(
    (id: ToolId) => {
      if (toolRef.current === "poly" && id !== "poly") cancelPolygon();
      setTool(id);
    },
    [cancelPolygon],
  );

  const adjustSize = useCallback((d: number) => {
    setBrushSize((s) => Math.max(1, Math.min(300, s + d)));
  }, []);

  const toggleAllPanels = useCallback(() => {
    const target = !(leftCollapsed && rightCollapsed);
    setLeftCollapsed(target);
    setRightCollapsed(target);
  }, [leftCollapsed, rightCollapsed]);

  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSave();
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setModal("export");
        return;
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleAllPanels();
        return;
      }
      const k = e.key.toLowerCase();
      switch (k) {
        case "b":
          setToolWithReset("brush");
          setBrushKindState("pencil");
          break;
        case "e":
          setToolWithReset("eraser");
          break;
        case "p":
          setToolWithReset("brush");
          setBrushKindState("pencil");
          break;
        case "m":
          setToolWithReset("brush");
          setBrushKindState("marker");
          break;
        case "w":
          setToolWithReset("brush");
          setBrushKindState("watercolor");
          break;
        case "a":
          setToolWithReset("brush");
          setBrushKindState("spray");
          break;
        case "c":
          setToolWithReset("brush");
          setBrushKindState("calligraphy");
          break;
        case "x":
          setToolWithReset("brush");
          setBrushKindState("graphite");
          break;
        case "k":
          setToolWithReset("brush");
          setBrushKindState("charcoal");
          break;
        case "n":
          setToolWithReset("brush");
          setBrushKindState("ink");
          break;
        case "g":
          setToolWithReset("bucket");
          break;
        case "i":
          setToolWithReset("dropper");
          break;
        case "l":
          setToolWithReset("line");
          break;
        case "r":
          setToolWithReset("rect");
          break;
        case "o":
          setToolWithReset("ellipse");
          break;
        case "d":
          setToolWithReset("halfcircle");
          break;
        case "u":
          setToolWithReset("triangle");
          break;
        case "v":
          setToolWithReset("arrow");
          break;
        case "y":
          setToolWithReset("poly");
          break;
        case "t":
          setToolWithReset("text");
          break;
        case "h":
          setToolWithReset("hand");
          break;
        case "[":
          adjustSize(-2);
          break;
        case "]":
          adjustSize(2);
          break;
        case "0":
          fitToView();
          updateBrushCursor();
          break;
        case "1":
          resetZoom100();
          break;
      }
      if (e.code === "Space" && !spacePanRef.current) {
        spacePanRef.current = true;
        viewportRef.current?.classList.add("tool-hand");
        e.preventDefault();
      }
      if (e.key === "Enter" && toolRef.current === "poly" && polyPointsRef.current.length >= 3) {
        commitPolygon();
      }
      if (e.key === "Escape") {
        if (toolRef.current === "poly") cancelPolygon();
        setModal(null);
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        spacePanRef.current = false;
        viewportRef.current?.classList.toggle("tool-hand", toolRef.current === "hand");
      }
    }
    function onSpaceScroll(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        !(
          (e.target as HTMLElement).tagName === "INPUT" ||
          (e.target as HTMLElement).tagName === "TEXTAREA" ||
          (e.target as HTMLElement).isContentEditable
        )
      )
        e.preventDefault();
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("keydown", onSpaceScroll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("keydown", onSpaceScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    redo,
    undo,
    toggleAllPanels,
    setToolWithReset,
    adjustSize,
    fitToView,
    resetZoom100,
    commitPolygon,
    cancelPolygon,
    updateBrushCursor,
  ]);

  /* ───────────── initial layer load ───────────────────── */
  const initedRef = useRef(false);
  useLayoutEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    const w = design.width,
      h = design.height;
    if (previewRef.current) {
      previewRef.current.width = w;
      previewRef.current.height = h;
    }
    if (wrapRef.current) {
      wrapRef.current.style.width = w + "px";
      wrapRef.current.style.height = h + "px";
    }

    layersRef.current = [];
    if (design.layers.length === 0) {
      // first time: bg layer + Layer 1
      if (design.bg !== "transparent") {
        const bgL = makeLayer({ name: "Background", paintBg: true });
        layersRef.current.push(bgL);
      }
      const main = makeLayer({ name: "Layer 1" });
      layersRef.current.push(main);
      activeIdRef.current = main.id;
      setActiveIdState(main.id);
      mountLayers();
      layersRef.current.forEach(updateThumb);
      fitToView();
      setLayerVersion((v) => v + 1);
    } else {
      // load saved layers
      const promises = design.layers.map((src) => {
        const layer = makeLayer({ id: src.id, name: src.name });
        layer.visible = src.visible;
        layer.opacity = src.opacity;
        if (!src.dataUrl) return Promise.resolve(layer);
        return new Promise<Layer>((resolve) => {
          const img = new Image();
          img.onload = () => {
            layer.ctx.drawImage(img, 0, 0);
            updateThumb(layer);
            resolve(layer);
          };
          img.onerror = () => resolve(layer);
          img.src = src.dataUrl!;
        });
      });
      Promise.all(promises).then((ls) => {
        layersRef.current = ls;
        activeIdRef.current = ls[ls.length - 1]?.id || null;
        setActiveIdState(activeIdRef.current);
        mountLayers();
        fitToView();
        setLayerVersion((v) => v + 1);
      });
    }
  }, [design, fitToView, makeLayer, mountLayers, updateThumb]);

  /* welcome modal on first run */
  useEffect(() => {
    try {
      if (!localStorage.getItem("paintoo-welcome-seen")) {
        setTimeout(() => setModal("welcome"), 250);
      }
    } catch {}
  }, []);

  /* refit canvas when the layout (mobile/desktop) toggles or once on
     first stable measurement (initial fit may run before grid settles) */
  const fittedOnceRef = useRef(false);
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let raf: number;
    function refit() {
      const r = vp!.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        fitToView();
        fittedOnceRef.current = true;
      }
    }
    if (!fittedOnceRef.current) {
      raf = requestAnimationFrame(() => requestAnimationFrame(refit));
    } else {
      refit();
    }
    return () => cancelAnimationFrame(raf);
  }, [isMobile, fitToView]);

  /* recompute on resize */
  useEffect(() => {
    const onResize = () => bumpView();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ───────────── layer ops ────────────────────────────── */
  const visibleLayers = (): LayerState[] =>
    layersRef.current.map((l) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
    }));

  const onLayerAdd = useCallback(() => {
    const l = makeLayer({});
    const cur = layersRef.current.find((x) => x.id === activeIdRef.current);
    const idx = (cur ? layersRef.current.indexOf(cur) : layersRef.current.length - 1) + 1;
    layersRef.current.splice(idx, 0, l);
    activeIdRef.current = l.id;
    setActiveIdState(l.id);
    mountLayers();
    updateThumb(l);
    setLayerVersion((v) => v + 1);
    pushHistory(
      "add layer",
      () => {
        const i = layersRef.current.findIndex((x) => x.id === l.id);
        if (i >= 0) {
          layersRef.current.splice(i, 1);
          if (activeIdRef.current === l.id) {
            activeIdRef.current = layersRef.current[Math.max(0, i - 1)]?.id ?? null;
            setActiveIdState(activeIdRef.current);
          }
          mountLayers();
          setLayerVersion((v) => v + 1);
        }
      },
      () => {
        const i = Math.min(layersRef.current.length, idx);
        layersRef.current.splice(i, 0, l);
        activeIdRef.current = l.id;
        setActiveIdState(l.id);
        mountLayers();
        setLayerVersion((v) => v + 1);
      },
    );
  }, [makeLayer, mountLayers, pushHistory, updateThumb]);

  const onLayerDuplicate = useCallback(() => {
    const src = layersRef.current.find((l) => l.id === activeIdRef.current);
    if (!src) return;
    const l = makeLayer({ name: src.name + " copy" });
    l.ctx.drawImage(src.canvas, 0, 0);
    l.opacity = src.opacity;
    l.visible = src.visible;
    const idx = layersRef.current.indexOf(src) + 1;
    layersRef.current.splice(idx, 0, l);
    activeIdRef.current = l.id;
    setActiveIdState(l.id);
    mountLayers();
    updateThumb(l);
    setLayerVersion((v) => v + 1);
    pushHistory(
      "duplicate layer",
      () => {
        const i = layersRef.current.findIndex((x) => x.id === l.id);
        if (i >= 0) {
          layersRef.current.splice(i, 1);
          activeIdRef.current = src.id;
          setActiveIdState(src.id);
          mountLayers();
          setLayerVersion((v) => v + 1);
        }
      },
      () => {
        const i = layersRef.current.indexOf(src) + 1;
        layersRef.current.splice(i, 0, l);
        activeIdRef.current = l.id;
        setActiveIdState(l.id);
        mountLayers();
        setLayerVersion((v) => v + 1);
      },
    );
  }, [makeLayer, mountLayers, pushHistory, updateThumb]);

  const onLayerDelete = useCallback(() => {
    if (layersRef.current.length <= 1) return;
    const l = layersRef.current.find((x) => x.id === activeIdRef.current);
    if (!l) return;
    const idx = layersRef.current.indexOf(l);
    const removed = l;
    layersRef.current.splice(idx, 1);
    activeIdRef.current = layersRef.current[Math.max(0, idx - 1)].id;
    setActiveIdState(activeIdRef.current);
    mountLayers();
    setLayerVersion((v) => v + 1);
    pushHistory(
      "delete layer",
      () => {
        layersRef.current.splice(idx, 0, removed);
        activeIdRef.current = removed.id;
        setActiveIdState(removed.id);
        mountLayers();
        setLayerVersion((v) => v + 1);
      },
      () => {
        const i = layersRef.current.indexOf(removed);
        if (i >= 0) layersRef.current.splice(i, 1);
        activeIdRef.current = layersRef.current[Math.max(0, idx - 1)].id;
        setActiveIdState(activeIdRef.current);
        mountLayers();
        setLayerVersion((v) => v + 1);
      },
    );
  }, [mountLayers, pushHistory]);

  const onLayerMove = useCallback(
    (dir: 1 | -1) => {
      const l = layersRef.current.find((x) => x.id === activeIdRef.current);
      if (!l) return;
      const idx = layersRef.current.indexOf(l);
      const tgt = idx + dir;
      if (tgt < 0 || tgt >= layersRef.current.length) return;
      layersRef.current.splice(idx, 1);
      layersRef.current.splice(tgt, 0, l);
      mountLayers();
      setLayerVersion((v) => v + 1);
      pushHistory(
        "reorder layer",
        () => {
          const i = layersRef.current.indexOf(l);
          layersRef.current.splice(i, 1);
          layersRef.current.splice(idx, 0, l);
          mountLayers();
          setLayerVersion((v) => v + 1);
        },
        () => {
          const i = layersRef.current.indexOf(l);
          layersRef.current.splice(i, 1);
          layersRef.current.splice(tgt, 0, l);
          mountLayers();
          setLayerVersion((v) => v + 1);
        },
      );
    },
    [mountLayers, pushHistory],
  );

  /** Reorder layers by id list. The arg is the new array of layer ids in
      desired order. Skips no-ops and records a single history entry. */
  const onLayerReorder = useCallback(
    (newIds: string[]) => {
      const cur = layersRef.current;
      const beforeIds = cur.map((l) => l.id);
      if (newIds.length !== beforeIds.length) return;
      if (beforeIds.every((id, i) => id === newIds[i])) return;
      const byId = new Map(cur.map((l) => [l.id, l]));
      const next = newIds.map((id) => byId.get(id)!).filter(Boolean);
      if (next.length !== cur.length) return;
      layersRef.current = next;
      mountLayers();
      setLayerVersion((v) => v + 1);
      pushHistory(
        "reorder layer",
        () => {
          const m = new Map(layersRef.current.map((l) => [l.id, l]));
          layersRef.current = beforeIds.map((id) => m.get(id)!).filter(Boolean);
          mountLayers();
          setLayerVersion((v) => v + 1);
        },
        () => {
          const m = new Map(layersRef.current.map((l) => [l.id, l]));
          layersRef.current = newIds.map((id) => m.get(id)!).filter(Boolean);
          mountLayers();
          setLayerVersion((v) => v + 1);
        },
      );
    },
    [mountLayers, pushHistory],
  );

  const onLayerVisibility = useCallback(
    (id: string) => {
      const l = layersRef.current.find((x) => x.id === id);
      if (!l) return;
      const wasVis = l.visible;
      l.visible = !l.visible;
      l.canvas.style.opacity = l.visible ? String(l.opacity) : "0";
      setLayerVersion((v) => v + 1);
      pushHistory(
        l.visible ? "show layer" : "hide layer",
        () => {
          const x = layersRef.current.find((y) => y.id === id);
          if (!x) return;
          x.visible = wasVis;
          x.canvas.style.opacity = wasVis ? String(x.opacity) : "0";
          setLayerVersion((v) => v + 1);
        },
        () => {
          const x = layersRef.current.find((y) => y.id === id);
          if (!x) return;
          x.visible = !wasVis;
          x.canvas.style.opacity = !wasVis ? String(x.opacity) : "0";
          setLayerVersion((v) => v + 1);
        },
      );
    },
    [pushHistory],
  );

  const onLayerRename = useCallback(
    (id: string, newName: string) => {
      const l = layersRef.current.find((x) => x.id === id);
      if (!l) return;
      const old = l.name;
      const v = newName.trim() || "Layer";
      if (v === old) return;
      l.name = v;
      setLayerVersion((vv) => vv + 1);
      pushHistory(
        "rename layer",
        () => {
          const x = layersRef.current.find((y) => y.id === id);
          if (x) {
            x.name = old;
            setLayerVersion((vv) => vv + 1);
          }
        },
        () => {
          const x = layersRef.current.find((y) => y.id === id);
          if (x) {
            x.name = v;
            setLayerVersion((vv) => vv + 1);
          }
        },
      );
    },
    [pushHistory],
  );

  const onLayerOpacity = useCallback((id: string, opacity: number) => {
    const l = layersRef.current.find((x) => x.id === id);
    if (!l) return;
    l.opacity = opacity;
    l.canvas.style.opacity = l.visible ? String(l.opacity) : "0";
    setLayerVersion((v) => v + 1);
  }, []);

  const onLayerOpacityCommit = useCallback(
    (id: string, oldOp: number, newOp: number) => {
      if (oldOp === newOp) return;
      pushHistory(
        "layer opacity",
        () => {
          const x = layersRef.current.find((y) => y.id === id);
          if (!x) return;
          x.opacity = oldOp;
          x.canvas.style.opacity = x.visible ? String(x.opacity) : "0";
          setLayerVersion((v) => v + 1);
        },
        () => {
          const x = layersRef.current.find((y) => y.id === id);
          if (!x) return;
          x.opacity = newOp;
          x.canvas.style.opacity = x.visible ? String(x.opacity) : "0";
          setLayerVersion((v) => v + 1);
        },
      );
    },
    [pushHistory],
  );

  /* ───────────── clear / save / export / import ───────── */
  const clearActiveLayer = useCallback(() => {
    commitEdit("clear layer", (l) => {
      l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
    });
    toast("layer cleared");
    setModal(null);
  }, [commitEdit, toast]);

  const flattenToCanvas = useCallback(
    (scale = 1, transparent = true): HTMLCanvasElement => {
      const w = design.width,
        h = design.height;
      const out = document.createElement("canvas");
      out.width = Math.round(w * scale);
      out.height = Math.round(h * scale);
      const ctx = out.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (!transparent) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, out.width, out.height);
      }
      layersRef.current.forEach((l) => {
        if (!l.visible) return;
        ctx.globalAlpha = l.opacity;
        ctx.drawImage(l.canvas, 0, 0, out.width, out.height);
      });
      ctx.globalAlpha = 1;
      return out;
    },
    [design.height, design.width],
  );

  const exportImage = useCallback(
    (format: "png" | "jpg", scale: number, transparent: boolean, quality: number) => {
      const out = flattenToCanvas(scale, format === "jpg" ? false : transparent);
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      const name = (fileName || "untitled") + "." + (format === "jpg" ? "jpg" : "png");
      out.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast(`saved · ${name}`);
        },
        mime,
        quality,
      );
    },
    [fileName, flattenToCanvas, toast],
  );

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const layers = layersRef.current.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        dataUrl: l.canvas.toDataURL("image/png"),
      }));
      const flat = flattenToCanvas(0.4, true);
      const thumb = flat.toDataURL("image/png");
      const res = await fetch(`/api/designs/${design.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          layers: JSON.stringify(layers),
          thumbnail: thumb,
          palette: JSON.stringify(palette),
        }),
      });
      if (res.ok) toast("saved");
      else toast("save failed");
    } catch {
      toast("save failed");
    } finally {
      setSaving(false);
    }
  }, [design.id, fileName, flattenToCanvas, palette, toast]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importImage = useCallback(
    (file: File) => {
      const img = new Image();
      img.onload = () => {
        const l = makeLayer({ name: file.name || "Imported" });
        const ratio = Math.min(design.width / img.width, design.height / img.height, 1);
        const w = img.width * ratio,
          h = img.height * ratio;
        const x = (design.width - w) / 2,
          y = (design.height - h) / 2;
        l.ctx.drawImage(img, x, y, w, h);
        updateThumb(l);
        const cur = layersRef.current.find((x) => x.id === activeIdRef.current);
        const idx = (cur ? layersRef.current.indexOf(cur) : layersRef.current.length - 1) + 1;
        layersRef.current.splice(idx, 0, l);
        activeIdRef.current = l.id;
        setActiveIdState(l.id);
        mountLayers();
        setLayerVersion((v) => v + 1);
        pushHistory(
          "import image",
          () => {
            const i = layersRef.current.findIndex((x) => x.id === l.id);
            if (i >= 0) layersRef.current.splice(i, 1);
            activeIdRef.current = layersRef.current[Math.max(0, i - 1)]?.id ?? null;
            setActiveIdState(activeIdRef.current);
            mountLayers();
            setLayerVersion((v) => v + 1);
          },
          () => {
            layersRef.current.splice(idx, 0, l);
            activeIdRef.current = l.id;
            setActiveIdState(l.id);
            mountLayers();
            setLayerVersion((v) => v + 1);
          },
        );
        toast(`imported ${file.name}`);
      };
      img.src = URL.createObjectURL(file);
    },
    [design.height, design.width, makeLayer, mountLayers, pushHistory, toast, updateThumb],
  );

  /* ───────────── color picker setters ─────────────────── */
  const setColorFromHex = useCallback((hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const [h, s, l] = rgbToHsl(...rgb);
    setColor({ h, s, l });
  }, []);

  /* derived for UI */
  const layerStates = useMemo(() => visibleLayers(), [layerVersion]);
  const activeLayer = layerStates.find((l) => l.id === activeId);
  const histLen = histRef.current.length;
  const canUndo = histIdx >= 0;
  const canRedo = histIdx < histLen - 1;
  const toolLabel = tool === "brush" ? `brush · ${brushKind}` : tool;

  /* ─────────────────────────────────────────────────────── render ─── */
  const leftPanelProps = {
    tool,
    setTool: setToolWithReset,
    brushKind,
    setBrushKind: setBrushKindState,
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
    brushFlow,
    setBrushFlow,
    brushSmoothing,
    setBrushSmoothing,
    shapeFill,
    setShapeFill,
    shapeStroke,
    setShapeStroke,
    shapeWeight,
    setShapeWeight,
    textFont,
    setTextFont,
    textSize,
    setTextSize,
    textItalic,
    setTextItalic,
    textBold,
    setTextBold,
    collapsed: leftCollapsed,
    setCollapsed: setLeftCollapsed,
  };

  const rightPanelProps = {
    color,
    setColor,
    setColorFromHex,
    palette,
    setPalette,
    layers: layerStates,
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
    collapsed: rightCollapsed,
    setCollapsed: setRightCollapsed,
    getThumbCanvas: (id: string) =>
      layersRef.current.find((l) => l.id === id)?.thumb,
  };

  return (
    <div
      className="h-[100dvh] w-screen grid bg-[color:var(--bg-deep)]"
      style={
        isMobile
          ? { gridTemplateRows: "48px 1fr 64px", gridTemplateColumns: "minmax(0, 1fr)" }
          : { gridTemplateRows: "52px 1fr 26px", gridTemplateColumns: "minmax(0, 1fr)" }
      }
    >
      {isMobile ? (
        <MobileTopBar
          fileName={fileName}
          onFileNameChange={setFileName}
          canUndo={canUndo}
          canRedo={canRedo}
          saving={saving}
          onUndo={undo}
          onRedo={redo}
          onSave={onSave}
          onHome={() => router.push("/")}
          onMore={() => setSheet("more")}
        />
      ) : (
        <TopBar
          fileName={fileName}
          onFileNameChange={setFileName}
          canUndo={canUndo}
          canRedo={canRedo}
          saving={saving}
          onUndo={undo}
          onRedo={redo}
          onNew={() => router.push("/")}
          onImport={() => fileInputRef.current?.click()}
          onExport={() => setModal("export")}
          onClear={() => setModal("clear")}
          onHelp={() => setModal("help")}
          onTheme={toggleTheme}
          onSave={onSave}
          onHome={() => router.push("/")}
        />
      )}

      <div
        className="relative grid min-h-0"
        style={
          isMobile
            ? { gridTemplateColumns: "minmax(0, 1fr)" }
            : { gridTemplateColumns: "auto 1fr auto" }
        }
      >
        {!isMobile && <LeftPanel {...leftPanelProps} />}

        {/* viewport */}
        <div
          ref={viewportRef}
          className={`relative overflow-hidden ${theme === "dark" ? "viewport-bg-dark" : "viewport-bg-light"} ${tool === "hand" ? "tool-hand" : ""}`}
          style={{
            cursor: tool === "hand" ? "grab" : isMobile ? "default" : "none",
            touchAction: "none",
          }}
        >
          <div
            ref={wrapRef}
            className="absolute checker canvas-wrap canvas-wrap-shadow"
            style={{ transformOrigin: "0 0" }}
          >
            <canvas
              ref={previewRef}
              className="preview absolute inset-0 w-full h-full pointer-events-none"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div ref={brushCursorRef} className="brush-cursor hidden">
            <div className="crosshair" />
          </div>
          <div
            ref={polyHintRef}
            className="pt-poly-hint absolute top-3.5 left-1/2 -translate-x-1/2 bg-[color:var(--panel)] border border-[color:var(--line)] text-[color:var(--ink-2)] px-3 py-1.5 rounded-full text-[11.5px] z-[8] hidden data-[show]:block shadow-soft"
            style={{ display: "none" }}
          >
            Click to add points · <kbd className="font-mono text-[10px] bg-[color:var(--bg)] border border-[color:var(--line)] px-1.5 rounded-sm">Enter</kbd> finish · <kbd className="font-mono text-[10px] bg-[color:var(--bg)] border border-[color:var(--line)] px-1.5 rounded-sm">Esc</kbd> cancel · <kbd className="font-mono text-[10px] bg-[color:var(--bg)] border border-[color:var(--line)] px-1.5 rounded-sm">Dbl-click</kbd> close
          </div>

          <div className="pt-zoom-widget absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[color:var(--panel)] border border-[color:var(--line)] rounded-full p-[3px] shadow-soft z-[8] font-mono">
            <button
              onClick={() => {
                const r = viewportRef.current!.getBoundingClientRect();
                zoomAt(1 / 1.25, r.left + r.width / 2, r.top + r.height / 2);
                updateBrushCursor();
              }}
              data-tip="Zoom out"
              className="w-[26px] h-[26px] rounded-full grid place-items-center text-[color:var(--ink-2)] hover:bg-[color:var(--bg)] hover:text-[color:var(--ink)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div
              className="text-[11px] text-[color:var(--ink-2)] hover:text-[color:var(--ink)] px-2.5 min-w-[56px] text-center select-none cursor-pointer"
              onClick={() => {
                fitToView();
                updateBrushCursor();
              }}
              title="Click to fit"
            >
              {zoomLabel}
            </div>
            <button
              onClick={() => {
                const r = viewportRef.current!.getBoundingClientRect();
                zoomAt(1.25, r.left + r.width / 2, r.top + r.height / 2);
                updateBrushCursor();
              }}
              data-tip="Zoom in"
              className="w-[26px] h-[26px] rounded-full grid place-items-center text-[color:var(--ink-2)] hover:bg-[color:var(--bg)] hover:text-[color:var(--ink)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <line x1="12" y1="5" x2="12" y2="19" />
              </svg>
            </button>
          </div>
        </div>

        {!isMobile && <RightPanel {...rightPanelProps} />}
      </div>

      {/* status bar (desktop) or action bar (mobile) */}
      {isMobile ? (
        <MobileActionBar
          sheet={sheet}
          setSheet={setSheet}
          tool={tool}
          brushKind={brushKind}
          color={color}
          layerCount={layerStates.length}
        />
      ) : (
        <div className="flex items-center gap-3.5 bg-[color:var(--panel)] border-t border-[color:var(--line)] px-3.5 text-[color:var(--ink-3)] font-mono text-[10.5px] z-[20]">
          <span className="px-1.5 py-[2px] bg-[color:var(--bg)] rounded border border-[color:var(--line)] text-[color:var(--ink-2)]">
            {toolLabel}
          </span>
          <span>{pos}</span>
          <span className="ml-auto">{design.width} × {design.height}</span>
          <span>{histIdx + 1} / {histLen}</span>
          <span className="text-[color:var(--accent)] font-serif italic">marks become memories</span>
        </div>
      )}

      {/* toasts */}
      <div className="fixed left-1/2 bottom-[60px] -translate-x-1/2 flex flex-col gap-2 items-center z-[150] pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} msg={t.msg} />
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importImage(f);
          e.currentTarget.value = "";
        }}
      />

      <Modals
        modal={modal}
        close={() => setModal(null)}
        onClear={clearActiveLayer}
        onExport={exportImage}
        onStartTour={startTour}
        onWelcomeClose={(skip) => {
          if (skip) {
            try {
              localStorage.setItem("paintoo-welcome-seen", "1");
            } catch {}
          }
          setModal(null);
        }}
      />

      {tourOpen && (
        <Tour
          isMobile={isMobile}
          steps={
            isMobile ? mobileTour((s) => setSheet(s)) : desktopTour()
          }
          onClose={() => setTourOpen(false)}
        />
      )}

      {/* mobile bottom sheets */}
      {isMobile && (
        <>
          <BottomSheet
            open={sheet === "tools"}
            onClose={() => setSheet(null)}
            title="tools"
            maxHeight="78vh"
          >
            <LeftPanel {...leftPanelProps} inSheet />
          </BottomSheet>
          <BottomSheet
            open={sheet === "color"}
            onClose={() => setSheet(null)}
            title="color"
            maxHeight="78vh"
          >
            <RightPanel {...rightPanelProps} inSheet section="color" />
          </BottomSheet>
          <BottomSheet
            open={sheet === "layers"}
            onClose={() => setSheet(null)}
            title="layers"
            maxHeight="78vh"
          >
            <RightPanel {...rightPanelProps} inSheet section="layers" />
          </BottomSheet>
          <MoreSheet
            open={sheet === "more"}
            onClose={() => setSheet(null)}
            onImport={() => fileInputRef.current?.click()}
            onExport={() => setModal("export")}
            onClear={() => setModal("clear")}
            onHelp={() => setModal("help")}
            onTheme={toggleTheme}
            onHome={() => router.push("/")}
            onStartTour={startTour}
          />
        </>
      )}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add("show"));
  }, []);
  return (
    <div ref={ref} className="pt-toast pointer-events-auto">
      <span className="pt-toast-dot" />
      <span>{msg}</span>
    </div>
  );
}
