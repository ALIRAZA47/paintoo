"use client";

import { useEffect, useRef } from "react";
import { hslToRgb, rgbToHex, type HSL } from "@/lib/editorCore";
import type { BrushKind } from "@/lib/editorCore";
import type { ToolId } from "./CanvasEditor";
import { ICONS } from "./icons";

const sv = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ──────────────────────────────────────────── mobile top bar ─── */

export function MobileTopBar({
  fileName,
  onFileNameChange,
  canUndo,
  canRedo,
  saving,
  onUndo,
  onRedo,
  onSave,
  onHome,
  onMore,
}: {
  fileName: string;
  onFileNameChange: (s: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onHome: () => void;
  onMore: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (nameRef.current && document.activeElement !== nameRef.current) {
      nameRef.current.value = fileName;
    }
  }, [fileName]);

  return (
    <div className="flex items-center gap-1 px-2 bg-[color:var(--panel)] border-b border-[color:var(--line)] z-20">
      <button
        onClick={onHome}
        aria-label="Back to gallery"
        className="w-10 h-10 rounded-lg grid place-items-center text-[color:var(--ink-2)] active:bg-[color:var(--panel-2)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <input
        ref={nameRef}
        defaultValue={fileName}
        onBlur={(e) => onFileNameChange(e.target.value || "untitled")}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        spellCheck={false}
        className="font-serif italic text-[18px] text-[color:var(--ink)] px-2 py-1 rounded-md bg-transparent border border-transparent focus:bg-[color:var(--bg)] focus:border-[color:var(--accent-dim)] outline-none min-w-0 flex-1 text-center"
      />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        className="w-10 h-10 rounded-lg grid place-items-center text-[color:var(--ink-2)] active:bg-[color:var(--panel-2)] disabled:opacity-35"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        className="w-10 h-10 rounded-lg grid place-items-center text-[color:var(--ink-2)] active:bg-[color:var(--panel-2)] disabled:opacity-35"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
        </svg>
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-[color:var(--accent)] active:bg-[color:var(--accent-2)] text-white font-medium text-[12.5px] h-9 px-3 rounded-lg disabled:opacity-50"
      >
        {saving ? "…" : "save"}
      </button>
      <button
        onClick={onMore}
        aria-label="More options"
        className="w-10 h-10 rounded-lg grid place-items-center text-[color:var(--ink-2)] active:bg-[color:var(--panel-2)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────── bottom action bar ─── */

export type SheetKind = "tools" | "color" | "layers" | "more" | null;

export function MobileActionBar({
  sheet,
  setSheet,
  tool,
  brushKind,
  color,
  layerCount,
}: {
  sheet: SheetKind;
  setSheet: (s: SheetKind) => void;
  tool: ToolId;
  brushKind: BrushKind;
  color: HSL;
  layerCount: number;
}) {
  const [r, g, b] = hslToRgb(color.h, color.s, color.l);
  const hex = rgbToHex(r, g, b);

  const items: Array<{
    id: Exclude<SheetKind, null>;
    label: string;
    render: () => React.ReactNode;
  }> = [
    {
      id: "tools",
      label: "Tools",
      render: () => (
        <div className="grid place-items-center w-full">
          <div className="text-[color:var(--ink)]">{ICONS[toolIcon(tool)]}</div>
          <span className="text-[9px] uppercase tracking-wider text-[color:var(--ink-3)] mt-0.5">
            {toolLabel(tool, brushKind)}
          </span>
        </div>
      ),
    },
    {
      id: "color",
      label: "Color",
      render: () => (
        <div className="grid place-items-center w-full">
          <div
            className="w-6 h-6 rounded-full border border-[color:var(--line)]"
            style={{ background: hex }}
          />
          <span className="text-[9px] uppercase tracking-wider text-[color:var(--ink-3)] mt-0.5 font-mono">
            {hex.slice(1, 4)}…
          </span>
        </div>
      ),
    },
    {
      id: "layers",
      label: "Layers",
      render: () => (
        <div className="grid place-items-center w-full">
          <div className="text-[color:var(--ink)]">
            <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
              <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
              <polyline points="2 15.5 12 22 22 15.5" />
            </svg>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-[color:var(--ink-3)] mt-0.5">
            {layerCount} layer{layerCount === 1 ? "" : "s"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex items-stretch bg-[color:var(--panel)] border-t border-[color:var(--line)] z-20 pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const active = sheet === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setSheet(active ? null : it.id)}
            className={`flex-1 grid place-items-center px-2 py-2 transition-colors ${
              active
                ? "text-[color:var(--accent)] bg-[color:var(--bg)]"
                : "text-[color:var(--ink-2)] active:bg-[color:var(--panel-2)]"
            }`}
          >
            {it.render()}
          </button>
        );
      })}
    </div>
  );
}

function toolIcon(t: ToolId): keyof typeof ICONS {
  if (t === "brush" || t === "eraser") return t;
  return t as keyof typeof ICONS;
}

function toolLabel(t: ToolId, k: BrushKind): string {
  if (t === "brush") return k;
  return t;
}

/* ──────────────────────────────────────────── bottom sheet ─── */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = "70vh",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-[150] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[151] bg-[color:var(--panel)] border-t border-[color:var(--line)] rounded-t-2xl shadow-soft transition-transform duration-[220ms] ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-[color:var(--line)] mx-auto" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <h3 className="font-serif italic text-[20px] leading-none tracking-tight text-[color:var(--ink)]">
            {title}
            <span className="text-[color:var(--accent)]">.</span>
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg grid place-items-center text-[color:var(--ink-3)] active:bg-[color:var(--panel-2)]"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" {...sv}>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div
          className="overflow-y-auto"
          style={{ maxHeight: `calc(${maxHeight} - 60px)` }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────── more menu ─── */

export function MoreSheet({
  open,
  onClose,
  onImport,
  onExport,
  onClear,
  onHelp,
  onTheme,
  onHome,
}: {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  onHelp: () => void;
  onTheme: () => void;
  onHome: () => void;
}) {
  const items = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      label: "Import image",
      onClick: () => {
        onClose();
        onImport();
      },
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      label: "Export",
      onClick: () => {
        onClose();
        onExport();
      },
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      ),
      label: "Clear layer",
      danger: true,
      onClick: () => {
        onClose();
        onClear();
      },
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
      label: "Shortcuts",
      onClick: () => {
        onClose();
        onHelp();
      },
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ),
      label: "Toggle theme",
      onClick: () => {
        onClose();
        onTheme();
      },
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" {...sv}>
          <path d="M3 9 12 2l9 7" />
          <path d="M5 9v11h14V9" />
        </svg>
      ),
      label: "Back to gallery",
      onClick: () => {
        onClose();
        onHome();
      },
    },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="more">
      <div className="px-2 pb-3">
        {items.map((it, i) => (
          <button
            key={i}
            onClick={it.onClick}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left active:bg-[color:var(--panel-2)] ${
              it.danger ? "text-[color:var(--danger)]" : "text-[color:var(--ink)]"
            }`}
          >
            <span className={it.danger ? "text-[color:var(--danger)]" : "text-[color:var(--ink-2)]"}>
              {it.icon}
            </span>
            <span className="text-[14px]">{it.label}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
