"use client";

import { useState } from "react";

export function Modals({
  modal,
  close,
  onClear,
  onExport,
  onWelcomeClose,
}: {
  modal: "new" | "export" | "clear" | "welcome" | "help" | null;
  close: () => void;
  onClear: () => void;
  onExport: (
    format: "png" | "jpg",
    scale: number,
    transparent: boolean,
    quality: number,
  ) => void;
  onWelcomeClose: (skip: boolean) => void;
}) {
  return (
    <>
      {/* clear */}
      <Scrim open={modal === "clear"} onClose={close}>
        <Heading>
          clear canvas<span className="text-[color:var(--accent)]">?</span>
        </Heading>
        <p className="text-[color:var(--ink-2)] my-2 mb-4 text-[13px]">
          This erases the active layer. You can undo this action.
        </p>
        <div className="flex gap-2 justify-end mt-4">
          <GhostBtn onClick={close}>Keep</GhostBtn>
          <DangerBtn onClick={onClear}>Clear layer</DangerBtn>
        </div>
      </Scrim>

      {/* export */}
      <ExportModal open={modal === "export"} onClose={close} onExport={onExport} />

      {/* welcome */}
      <WelcomeModal open={modal === "welcome"} onClose={onWelcomeClose} />

      {/* help */}
      <Scrim open={modal === "help"} onClose={close}>
        <Heading>
          shortcuts<span className="text-[color:var(--accent)]">.</span>
        </Heading>
        <p className="text-[color:var(--ink-2)] my-2 mb-4 text-[13px]">Keys you'll reach for.</p>
        <KbdList
          items={[
            ["Brush", "B"],
            ["Eraser", "E"],
            ["Pencil brush", "P"],
            ["Marker", "M"],
            ["Watercolor", "W"],
            ["Spray", "A"],
            ["Calligraphy", "C"],
            ["Eyedropper", "I"],
            ["Bucket fill", "G"],
            ["Line / Rect / Ellipse / Polygon", "L R O Y"],
            ["Text", "T"],
            ["Hand", "H · hold Space"],
            ["Brush size", "[  ]"],
            ["Undo / Redo", "⌘Z · ⌘⇧Z"],
            ["Save", "⌘S"],
            ["Export", "⌘E"],
            ["Fit canvas", "0"],
            ["100% zoom", "1"],
            ["Toggle panels", "⌘\\"],
          ]}
        />
        <div className="flex gap-2 justify-end mt-4">
          <PrimaryBtn onClick={close}>Close</PrimaryBtn>
        </div>
      </Scrim>
    </>
  );
}

function ExportModal({
  open,
  onClose,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (
    format: "png" | "jpg",
    scale: number,
    transparent: boolean,
    quality: number,
  ) => void;
}) {
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(92);
  const [transparent, setTransparent] = useState(true);
  const [scale, setScale] = useState(1);

  return (
    <Scrim open={open} onClose={onClose}>
      <Heading>
        export<span className="text-[color:var(--accent)]">.</span>
      </Heading>
      <p className="text-[color:var(--ink-2)] my-2 mb-4 text-[13px]">
        Flatten the layers and save your image.
      </p>
      <Row label="Format">
        <select
          className="num-input max-w-[160px]"
          value={format}
          onChange={(e) => setFormat(e.target.value as "png" | "jpg")}
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
        </select>
      </Row>
      {format === "jpg" && (
        <Row label="Quality">
          <input
            type="range"
            className="pt flex-1"
            min={50}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
          <span className="font-mono text-[color:var(--ink-2)] min-w-[36px] text-right text-[11.5px]">
            {quality}
          </span>
        </Row>
      )}
      {format === "png" && (
        <Row label="Background">
          <label className="pt-check">
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
            />{" "}
            Transparent
          </label>
        </Row>
      )}
      <Row label="Scale">
        <select
          className="num-input max-w-[120px]"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={0.5}>0.5×</option>
        </select>
      </Row>
      <div className="flex gap-2 justify-end mt-4">
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            onExport(format, scale, transparent, quality / 100);
            onClose();
          }}
        >
          Save
        </PrimaryBtn>
      </div>
    </Scrim>
  );
}

function WelcomeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (skip: boolean) => void;
}) {
  const [skip, setSkip] = useState(false);
  return (
    <Scrim open={open} onClose={() => onClose(skip)}>
      <Heading>
        welcome to paintoo<span className="text-[color:var(--accent)]">.</span>
      </Heading>
      <p className="text-[color:var(--ink-2)] my-2 mb-4 text-[13px] leading-relaxed">
        A small studio for marks. Pick a brush, pick a color, leave a trace. Stylus pressure is
        supported where your device offers it.
      </p>
      <KbdList
        items={[
          ["Brush", "B"],
          ["Eraser", "E"],
          ["Eyedropper", "I"],
          ["Bucket fill", "G"],
          ["Hand / pan", "H or Space"],
          ["Text", "T"],
          ["Brush size", "[  ]"],
          ["Undo / Redo", "⌘Z / ⌘⇧Z"],
          ["Save", "⌘S"],
          ["Fit canvas", "0"],
        ]}
      />
      <label className="pt-check">
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />{" "}
        Don't show this again
      </label>
      <div className="flex gap-2 justify-end mt-4">
        <PrimaryBtn onClick={() => onClose(skip)}>Start drawing</PrimaryBtn>
      </div>
    </Scrim>
  );
}

function Scrim({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`pt-scrim ${open ? "open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif italic font-normal text-[30px] tracking-tight m-0 mb-1 leading-none">
      {children}
    </h2>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 my-2">
      <label className="text-[12px] text-[color:var(--ink-2)] w-[110px]">{label}</label>
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[12.5px] py-1.5 px-3 rounded-md bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] text-white font-medium"
    >
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[12.5px] py-1.5 px-3 rounded-md text-[color:var(--ink-2)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel-2)]"
    >
      {children}
    </button>
  );
}
function DangerBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[12.5px] py-1.5 px-3 rounded-md text-[color:var(--danger)] border border-[color:var(--line)] hover:bg-[color:var(--danger)] hover:text-white hover:border-[color:var(--danger)] transition-colors"
    >
      {children}
    </button>
  );
}

function KbdList({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 my-3 mb-4">
      {items.map(([label, key]) => (
        <div
          key={label}
          className="flex justify-between text-[12px] text-[color:var(--ink-2)] py-1 border-b border-dashed border-[color:var(--line-soft)]"
        >
          <span>{label}</span>
          <kbd className="font-mono text-[10.5px] bg-[color:var(--bg)] border border-[color:var(--line)] text-[color:var(--ink)] px-1.5 py-[1px] rounded">
            {key}
          </kbd>
        </div>
      ))}
    </div>
  );
}
