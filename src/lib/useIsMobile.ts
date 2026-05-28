"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the viewport is narrower than `breakpoint` (default 1024px,
 * Tailwind's `lg`). SSR-safe: returns `false` on the server and during the
 * initial client render, then re-syncs after mount.
 */
export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}
