"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NewCanvasModal, { type NewCanvasInput } from "./NewCanvasModal";
import type { DesignSummary } from "@/lib/db";

function relativeTime(ts: number): string {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  if (d < 86400 * 30) return `${Math.round(d / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HomeClient({
  initialDesigns,
}: {
  initialDesigns: DesignSummary[];
}) {
  const router = useRouter();
  const [designs, setDesigns] = useState(initialDesigns);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("paintoo-theme", next);
    } catch {}
    setTheme(next);
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  async function createDesign(input: NewCanvasInput) {
    setCreating(true);
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: input.name || "untitled",
          width: input.width,
          height: input.height,
          bg: input.bg,
          layers: JSON.stringify([]),
        }),
      });
      if (!res.ok) {
        setCreating(false);
        return;
      }
      const j = await res.json();
      router.push(`/canvas/${j.design.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteDesign(id: number) {
    if (!confirm("Delete this design? This cannot be undone.")) return;
    const res = await fetch(`/api/designs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDesigns((arr) => arr.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="h-[100dvh] bg-[color:var(--bg-deep)] text-[color:var(--ink)] overflow-y-auto">
      {/* topbar */}
      <header className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 h-[56px] sm:h-[60px] border-b border-[color:var(--line)] bg-[color:var(--panel)] sticky top-0 z-20">
        <div className="font-serif italic text-[24px] sm:text-[28px] leading-none tracking-tight select-none">
          paintoo<span className="text-[color:var(--accent)]">.</span>
        </div>
        <span className="font-serif italic text-[15px] text-[color:var(--ink-3)] hidden sm:inline">
          a studio for marks
        </span>
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-md grid place-items-center text-[color:var(--ink-2)] active:bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--ink)]"
          aria-label="Toggle theme"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
        <button
          onClick={logout}
          className="text-[12.5px] text-[color:var(--ink-2)] hover:text-[color:var(--ink)] px-3 py-1.5 rounded-md hover:bg-[color:var(--panel-2)] active:bg-[color:var(--panel-2)]"
        >
          sign out
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-[calc(env(safe-area-inset-bottom)+96px)] sm:pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-serif italic text-[34px] sm:text-[42px] leading-none tracking-tight">
              your studio<span className="text-[color:var(--accent)]">.</span>
            </h1>
            <p className="text-[color:var(--ink-3)] mt-2 sm:mt-3 text-[13.5px]">
              {designs.length === 0
                ? "no canvases yet — leave a first mark."
                : `${designs.length} canvas${designs.length === 1 ? "" : "es"}`}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="hidden sm:flex rounded-[8px] bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] text-white font-medium text-[13px] py-2.5 px-4 transition-colors items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            new canvas
          </button>
        </div>

        {designs.length === 0 ? (
          <div className="border border-dashed border-[color:var(--line)] rounded-xl p-10 sm:p-16 grid place-items-center text-center">
            <div className="font-serif italic text-[24px] sm:text-[28px] text-[color:var(--ink-2)] mb-3">
              an empty studio
            </div>
            <p className="text-[color:var(--ink-3)] mb-6 max-w-[400px]">
              Start a canvas to begin. Pick a size, a ground, leave a trace.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="rounded-[8px] bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] active:bg-[color:var(--accent-2)] text-white font-medium text-[13px] py-2.5 px-4"
            >
              start your first canvas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {designs.map((d) => (
              <DesignCard key={d.id} design={d} onDelete={() => deleteDesign(d.id)} />
            ))}
          </div>
        )}
      </main>

      {/* mobile floating action button */}
      <button
        onClick={() => setShowNew(true)}
        className="sm:hidden fixed right-5 z-30 rounded-full bg-[color:var(--accent)] text-white shadow-soft active:bg-[color:var(--accent-2)] flex items-center gap-2 px-5 h-12 font-medium text-[14px]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        new canvas
      </button>

      <NewCanvasModal
        open={showNew}
        busy={creating}
        onClose={() => setShowNew(false)}
        onCreate={createDesign}
      />
    </div>
  );
}

function DesignCard({ design, onDelete }: { design: DesignSummary; onDelete: () => void }) {
  return (
    <div className="group relative rounded-[10px] border border-[color:var(--line)] bg-[color:var(--panel)] overflow-hidden hover:border-[color:var(--accent-dim)] transition-colors">
      <Link href={`/canvas/${design.id}`} className="block">
        <div className="aspect-[16/10] checker relative overflow-hidden">
          {design.thumbnail ? (
            <img
              src={design.thumbnail}
              alt={design.name}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[color:var(--ink-4)] font-serif italic text-[18px]">
              untouched
            </div>
          )}
        </div>
        <div className="p-3.5">
          <div className="font-serif italic text-[18px] leading-tight truncate">
            {design.name}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-[color:var(--ink-3)]">
            <span>{design.width} × {design.height}</span>
            <span>{relativeTime(design.updated_at)}</span>
          </div>
        </div>
      </Link>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-md bg-[color:var(--panel)] border border-[color:var(--line)] text-[color:var(--ink-3)] opacity-0 group-hover:opacity-100 hover:text-[color:var(--danger)] hover:border-[color:var(--danger)] transition-all"
        title="Delete"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
