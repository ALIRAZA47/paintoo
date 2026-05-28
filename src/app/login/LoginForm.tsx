"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "login failed");
        return;
      }
      const target = nextPath && nextPath.startsWith("/") ? nextPath : "/";
      router.push(target);
      router.refresh();
    } catch (err) {
      setError("network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-[11px] uppercase tracking-wider text-[color:var(--ink-4)] font-medium">
        Username
      </label>
      <input
        autoFocus
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="num-input !text-[13px] !py-2 !px-3"
      />
      <label className="text-[11px] uppercase tracking-wider text-[color:var(--ink-4)] font-medium mt-2">
        Password
      </label>
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="num-input !text-[13px] !py-2 !px-3"
      />
      {error ? (
        <div className="text-[color:var(--danger)] text-[12px] mt-1">{error}</div>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-[7px] bg-[color:var(--accent)] hover:bg-[color:var(--accent-2)] text-white font-medium text-[13px] py-2 px-4 transition-colors disabled:opacity-50"
      >
        {busy ? "signing in…" : "sign in"}
      </button>
    </form>
  );
}
