"use client";

import { ICONS } from "./icons";
import type { ToolId } from "./CanvasEditor";
import type { BrushKind } from "@/lib/editorCore";

const TOOLS: Array<{ id: ToolId; label: string; key: string; icon: keyof typeof ICONS }> = [
  { id: "brush", label: "Brush", key: "B", icon: "brush" },
  { id: "eraser", label: "Eraser", key: "E", icon: "eraser" },
  { id: "bucket", label: "Fill", key: "G", icon: "bucket" },
  { id: "dropper", label: "Eyedropper", key: "I", icon: "dropper" },
  { id: "line", label: "Line", key: "L", icon: "line" },
  { id: "rect", label: "Rectangle", key: "R", icon: "rect" },
  { id: "ellipse", label: "Ellipse", key: "O", icon: "ellipse" },
  { id: "poly", label: "Polygon", key: "Y", icon: "poly" },
  { id: "text", label: "Text", key: "T", icon: "text" },
  { id: "hand", label: "Hand (pan)", key: "H", icon: "hand" },
];

const BRUSH_KINDS: Array<{ id: BrushKind; label: string }> = [
  { id: "pencil", label: "pencil" },
  { id: "marker", label: "marker" },
  { id: "watercolor", label: "watercolor" },
  { id: "spray", label: "spray" },
  { id: "calligraphy", label: "calligraphy" },
];

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 mt-3">
      <div className="flex justify-between items-baseline text-[11.5px] text-[color:var(--ink-3)]">
        <span>{label}</span>
        <span className="font-mono text-[color:var(--ink)] text-[11px]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="pt"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

type LeftPanelProps = {
  tool: ToolId;
  setTool: (t: ToolId) => void;
  brushKind: BrushKind;
  setBrushKind: (k: BrushKind) => void;
  brushSize: number;
  setBrushSize: (n: number) => void;
  brushOpacity: number;
  setBrushOpacity: (n: number) => void;
  brushFlow: number;
  setBrushFlow: (n: number) => void;
  brushSmoothing: number;
  setBrushSmoothing: (n: number) => void;
  shapeFill: boolean;
  setShapeFill: (b: boolean) => void;
  shapeStroke: boolean;
  setShapeStroke: (b: boolean) => void;
  shapeWeight: number;
  setShapeWeight: (n: number) => void;
  textFont: string;
  setTextFont: (s: string) => void;
  textSize: number;
  setTextSize: (n: number) => void;
  textItalic: boolean;
  setTextItalic: (b: boolean) => void;
  textBold: boolean;
  setTextBold: (b: boolean) => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
  /** When true: render as flat content for embedding in a mobile sheet. */
  inSheet?: boolean;
};

export function LeftPanel(props: LeftPanelProps) {
  const {
    tool,
    setTool,
    brushKind,
    setBrushKind,
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
    collapsed,
    setCollapsed,
    inSheet,
  } = props;

  if (inSheet) {
    return (
      <div className="flex flex-col pb-4">
        <LeftPanelSections {...props} />
      </div>
    );
  }

  const showBrush = tool === "brush" || tool === "eraser";
  const showShape = tool === "line" || tool === "rect" || tool === "ellipse" || tool === "poly";
  const showText = tool === "text";

  return (
    <>
      <aside
        className={`relative z-10 bg-[color:var(--panel)] border-r border-[color:var(--line)] flex flex-col min-h-0 transition-[width] duration-[220ms] ease-out ${
          collapsed ? "w-0 border-0 overflow-hidden" : "w-[260px]"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <LeftPanelSections {...props} />
        </div>

        {/* collapse toggle */}
        <button
          onClick={() => setCollapsed(true)}
          data-tip="Collapse"
          className="pt-panel-toggle absolute top-3 right-[-14px] w-[14px] h-[56px] bg-[color:var(--panel)] border border-l-0 border-[color:var(--line)] rounded-r-md grid place-items-center cursor-pointer z-[5] text-[color:var(--ink-3)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel-2)] transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 1.5 2.5 4.5 6 7.5" />
          </svg>
        </button>
      </aside>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="pt-reopen-tab absolute top-[18px] left-0 w-[18px] h-[64px] bg-[color:var(--panel)] border border-l-0 border-[color:var(--line)] rounded-r-lg grid place-items-center cursor-pointer text-[color:var(--ink-3)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel-2)] z-[9]"
        >
          <svg width="10" height="10" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 1.5 6.5 4.5 3 7.5" />
          </svg>
        </button>
      )}
    </>
  );
}

function LeftPanelSections(props: LeftPanelProps) {
  const {
    tool,
    setTool,
    brushKind,
    setBrushKind,
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
  } = props;
  const showBrush = tool === "brush" || tool === "eraser";
  const showShape = tool === "line" || tool === "rect" || tool === "ellipse" || tool === "poly";
  const showText = tool === "text";

  return (
    <>
      <div className="border-b border-[color:var(--line-soft)] px-4 py-3.5">
        <div className="flex justify-between items-center mb-3">
          <div className="font-serif italic text-[17px] text-[color:var(--ink)] tracking-tight">
            Tools
          </div>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-4 gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              data-tip={t.label}
              className={`tip-side aspect-square grid place-items-center rounded-lg relative transition-colors border ${
                tool === t.id
                  ? "bg-[color:var(--bg)] text-[color:var(--accent)] border-[color:var(--accent-dim)]"
                  : "border-transparent text-[color:var(--ink-2)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--ink)]"
              }`}
            >
              {ICONS[t.icon]}
              <span
                className={`absolute bottom-[3px] right-[4px] font-mono text-[8.5px] ${
                  tool === t.id ? "text-[color:var(--accent)] opacity-80" : "text-[color:var(--ink-4)]"
                }`}
              >
                {t.key}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showBrush && (
        <div className="border-b border-[color:var(--line-soft)] px-4 py-3.5">
          <div className="flex justify-between items-center mb-3">
            <div className="font-serif italic text-[17px] text-[color:var(--ink)] tracking-tight">
              Brush
            </div>
            <span className="text-[10.5px] text-[color:var(--ink-4)] uppercase tracking-wider font-medium">
              {brushKind}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {BRUSH_KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setBrushKind(k.id)}
                className={`px-2.5 py-1 text-[11.5px] rounded-full border transition-all ${
                  brushKind === k.id
                    ? "bg-[color:var(--accent)] text-white border-[color:var(--accent)]"
                    : "text-[color:var(--ink-2)] border-[color:var(--line)] hover:text-[color:var(--ink)] hover:border-[color:var(--ink-4)]"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <Slider label="Size" value={brushSize} min={1} max={300} unit=" px" onChange={setBrushSize} />
          <Slider
            label="Opacity"
            value={Math.round(brushOpacity * 100)}
            min={1}
            max={100}
            unit="%"
            onChange={(n) => setBrushOpacity(n / 100)}
          />
          <Slider
            label="Flow"
            value={Math.round(brushFlow * 100)}
            min={1}
            max={100}
            unit="%"
            onChange={(n) => setBrushFlow(n / 100)}
          />
          <Slider
            label="Smoothing"
            value={Math.round(brushSmoothing * 100)}
            min={0}
            max={80}
            unit="%"
            onChange={(n) => setBrushSmoothing(n / 100)}
          />
        </div>
      )}

      {showShape && (
        <div className="border-b border-[color:var(--line-soft)] px-4 py-3.5">
          <div className="flex justify-between items-center mb-3">
            <div className="font-serif italic text-[17px] text-[color:var(--ink)] tracking-tight">
              Shape
            </div>
          </div>
          <label className="pt-check mb-1.5">
            <input
              type="checkbox"
              checked={shapeFill}
              onChange={(e) => setShapeFill(e.target.checked)}
            />{" "}
            Fill
          </label>
          <br />
          <label className="pt-check mb-1.5">
            <input
              type="checkbox"
              checked={shapeStroke}
              onChange={(e) => setShapeStroke(e.target.checked)}
            />{" "}
            Stroke
          </label>
          <Slider
            label="Stroke weight"
            value={shapeWeight}
            min={1}
            max={60}
            unit=" px"
            onChange={setShapeWeight}
          />
        </div>
      )}

      {showText && (
        <div className="border-b border-[color:var(--line-soft)] px-4 py-3.5">
          <div className="flex justify-between items-center mb-3">
            <div className="font-serif italic text-[17px] text-[color:var(--ink)] tracking-tight">
              Text
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <select
              className="num-input"
              value={textFont}
              onChange={(e) => setTextFont(e.target.value)}
            >
              <option>Inter Tight</option>
              <option>Instrument Serif</option>
              <option>JetBrains Mono</option>
              <option>Georgia</option>
              <option>Helvetica</option>
              <option>Times New Roman</option>
              <option>Courier New</option>
            </select>
            <Slider
              label="Size"
              value={textSize}
              min={8}
              max={240}
              unit=" px"
              onChange={setTextSize}
            />
            <label className="pt-check">
              <input
                type="checkbox"
                checked={textItalic}
                onChange={(e) => setTextItalic(e.target.checked)}
              />{" "}
              Italic
            </label>
            <label className="pt-check">
              <input
                type="checkbox"
                checked={textBold}
                onChange={(e) => setTextBold(e.target.checked)}
              />{" "}
              Bold
            </label>
          </div>
        </div>
      )}
    </>
  );
}
