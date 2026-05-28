import type { JSX } from "react";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ICONS: Record<string, JSX.Element> = {
  brush: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M9.5 14.5 4 20" />
      <path d="M16 4l4 4-9 9-4-4z" />
      <path d="M14 6l4 4" />
    </svg>
  ),
  eraser: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="m7 21-4-4 11-11 8 8-7 7z" />
      <path d="M14 6l4 4" />
    </svg>
  ),
  bucket: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="m19 11-8-8-8 8 8 8 8-8z" />
      <path d="M5 14h14" />
      <path d="M21 17v2a1 1 0 0 1-2 0v-2" />
    </svg>
  ),
  dropper: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="m13 3 4 4" />
      <path d="m15 5-9 9 0 5 5 0 9-9z" />
      <path d="m6 14-3 3 3 3" />
    </svg>
  ),
  line: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  ),
  rect: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="5" width="16" height="14" rx="1" />
    </svg>
  ),
  ellipse: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <ellipse cx="12" cy="12" rx="9" ry="7" />
    </svg>
  ),
  poly: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <polygon points="12 3 22 10 18 21 6 21 2 10" />
    </svg>
  ),
  text: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  hand: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M18 11V6a2 2 0 0 0-4 0" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v9" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-2-7-8C4 12 4 11 5 11s2 1 3 3" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="m1 1 22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  ),
};
