"use client";

import { useEffect, useRef } from "react";

const sv = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconButton({
  onClick,
  tip,
  children,
  disabled,
  active,
}: {
  onClick?: () => void;
  tip: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      data-tip={tip}
      onClick={onClick}
      disabled={disabled}
      className={`w-[30px] h-[30px] rounded-[7px] grid place-items-center transition-all border ${
        active
          ? "bg-[color:var(--bg)] text-[color:var(--accent)] border-[color:var(--accent-dim)]"
          : "border-transparent text-[color:var(--ink-2)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--ink)]"
      } disabled:opacity-35 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function TopBar({
  fileName,
  onFileNameChange,
  canUndo,
  canRedo,
  saving,
  onUndo,
  onRedo,
  onImport,
  onExport,
  onClear,
  onHelp,
  onTheme,
  onSave,
  onHome,
}: {
  fileName: string;
  onFileNameChange: (s: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  onHelp: () => void;
  onTheme: () => void;
  onSave: () => void;
  onHome: () => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (nameRef.current && document.activeElement !== nameRef.current) {
      nameRef.current.value = fileName;
    }
  }, [fileName]);

  return (
    <div className="flex items-center gap-3.5 px-4 bg-[color:var(--panel)] border-b border-[color:var(--line)] z-20">
      <button
        onClick={onHome}
        className="font-serif italic text-[26px] leading-none tracking-tight pr-2.5 mr-1 border-r border-[color:var(--line)] text-[color:var(--ink)] select-none cursor-pointer hover:opacity-80"
      >
        paintoo<span className="text-[color:var(--accent)]">.</span>
      </button>

      <div className="flex gap-0.5 items-center">
        <IconButton tip="Back to gallery" onClick={onHome}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <path d="M3 9 12 2l9 7" />
            <path d="M5 9v11h14V9" />
          </svg>
        </IconButton>
        <IconButton tip="Import image" onClick={onImport}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </IconButton>
        <IconButton tip="Export…" onClick={onExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </IconButton>
      </div>

      <div className="w-px h-[22px] bg-[color:var(--line)] mx-1.5" />

      <div className="flex gap-0.5 items-center">
        <IconButton tip="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
          </svg>
        </IconButton>
        <IconButton tip="Redo (⌘⇧Z)" onClick={onRedo} disabled={!canRedo}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
          </svg>
        </IconButton>
      </div>

      <div className="w-px h-[22px] bg-[color:var(--line)] mx-1.5" />

      <input
        ref={nameRef}
        defaultValue={fileName}
        onBlur={(e) => onFileNameChange(e.target.value || "untitled")}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        spellCheck={false}
        className="font-serif italic text-[18px] text-[color:var(--ink-2)] px-2.5 py-1 rounded-md bg-transparent border border-transparent hover:bg-[color:var(--panel-2)] focus:bg-[color:var(--bg)] focus:border-[color:var(--accent-dim)] focus:text-[color:var(--ink)] outline-none transition-colors min-w-[120px] max-w-[260px]"
      />

      <div className="flex-1" />

      <button
        onClick={onSave}
        disabled={saving}
        data-tour="save"
        className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] text-white font-medium text-[12.5px] py-1.5 px-3 rounded-[7px] transition-colors disabled:opacity-50"
        data-tip="Save (⌘S)"
      >
        {saving ? "saving…" : "save"}
      </button>

      <div className="flex gap-0.5 items-center">
        <IconButton tip="Clear canvas" onClick={onClear}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </IconButton>
        <IconButton tip="Shortcuts" onClick={onHelp}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </IconButton>
        <IconButton tip="Toggle theme" onClick={onTheme}>
          <svg width="16" height="16" viewBox="0 0 24 24" {...sv}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}
