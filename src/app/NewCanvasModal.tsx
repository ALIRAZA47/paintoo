"use client";

import { useEffect, useState } from "react";

export type NewCanvasInput = {
  name: string;
  width: number;
  height: number;
  bg: string;
};

const PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: "16 : 10", w: 1600, h: 1000 },
  { label: "16 : 9", w: 1920, h: 1080 },
  { label: "Square", w: 1080, h: 1080 },
  { label: "Portrait", w: 1080, h: 1920 },
  { label: "A4 300dpi", w: 2480, h: 3508 },
];

const BG_PRESETS: Array<{ value: string; label: string }> = [
  { value: "transparent", label: "Transparent" },
  { value: "#FFFFFF", label: "White paper" },
  { value: "#F4ECD8", label: "Cream paper" },
  { value: "#0E0D0B", label: "Black" },
];

export default function NewCanvasModal({
  open,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (input: NewCanvasInput) => void;
}) {
  const [name, setName] = useState("untitled");
  const [width, setWidth] = useState(1600);
  const [height, setHeight] = useState(1000);
  const [bg, setBg] = useState("#FFFFFF");
  const [customBg, setCustomBg] = useState("#FFFFFF");
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`pt-scrim ${open ? "open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif italic text-[30px] leading-none tracking-tight m-0 mb-1">
          new canvas<span className="text-[color:var(--accent)]">.</span>
        </h2>
        <p className="text-[color:var(--ink-2)] text-[13px] my-2 mb-4">
          What size and ground shall we start with?
        </p>

        <div className="flex items-center gap-2 my-2">
          <label className="text-[12px] text-[color:var(--ink-2)] w-[110px]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="num-input flex-1"
          />
        </div>
        <div className="flex items-center gap-2 my-2">
          <label className="text-[12px] text-[color:var(--ink-2)] w-[110px]">Width</label>
          <input
            type="number"
            value={width}
            min={16}
            max={8000}
            onChange={(e) => setWidth(parseInt(e.target.value) || 16)}
            className="num-input max-w-[100px]"
          />
          <span className="font-mono text-[11.5px] text-[color:var(--ink-4)]">px</span>
        </div>
        <div className="flex items-center gap-2 my-2">
          <label className="text-[12px] text-[color:var(--ink-2)] w-[110px]">Height</label>
          <input
            type="number"
            value={height}
            min={16}
            max={8000}
            onChange={(e) => setHeight(parseInt(e.target.value) || 16)}
            className="num-input max-w-[100px]"
          />
          <span className="font-mono text-[11.5px] text-[color:var(--ink-4)]">px</span>
        </div>
        <div className="flex items-center gap-2 my-2">
          <label className="text-[12px] text-[color:var(--ink-2)] w-[110px]">Background</label>
          <select
            value={isCustom ? "custom" : bg}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setIsCustom(true);
              } else {
                setIsCustom(false);
                setBg(e.target.value);
              }
            }}
            className="num-input max-w-[180px]"
          >
            {BG_PRESETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {isCustom && (
            <input
              value={customBg}
              onChange={(e) => setCustomBg(e.target.value)}
              maxLength={7}
              className="num-input max-w-[90px]"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap my-2 mt-3">
          <label className="text-[12px] text-[color:var(--ink-2)] w-[110px]">Presets</label>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setWidth(p.w);
                setHeight(p.h);
              }}
              className="text-[11.5px] px-2.5 py-1 rounded-full border border-[color:var(--line)] text-[color:var(--ink-2)] hover:text-[color:var(--ink)] hover:border-[color:var(--ink-4)]"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onClose}
            className="text-[12.5px] py-1.5 px-3 rounded-md text-[color:var(--ink-2)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel-2)]"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() =>
              onCreate({
                name: name.trim() || "untitled",
                width: Math.max(16, Math.min(8000, width)),
                height: Math.max(16, Math.min(8000, height)),
                bg: isCustom ? customBg : bg,
              })
            }
            className="text-[12.5px] py-1.5 px-3 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] text-white font-medium disabled:opacity-50"
          >
            {busy ? "creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
