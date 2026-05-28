# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Paintoo is a single-user, password-protected digital painting studio. The editor at `/canvas/[id]` is a React port of a single-file HTML/CSS/JS design prototype (the original spec lives in the user's brief, not in this repo). Designs are persisted as PNG-data-URL layers in SQLite.

## Commands

```
npm run dev      # next dev (defaults to PORT 3210 via .claude/launch.json)
npm run build    # next build — runs full type check
npm run start    # production server
npx tsc --noEmit # type check without running the build
```

There is no test suite. Verify behavior by running the dev server and exercising the UI; for headless smoke tests use `mcp__Claude_Preview__preview_*` (a `.claude/launch.json` is already configured).

## Required env (`.env.local`)

```
AUTH_USERNAME=...
AUTH_PASSWORD=...
AUTH_SECRET=...     # >= 8 chars, used to sign session cookies
# DB_PATH=./data/paintoo.db   # optional
```

The middleware returns HTTP 500 with an explicit message if `AUTH_SECRET` is missing.

## Architecture

### Auth split: edge vs node

`src/lib/auth-edge.ts` is the only auth module that may be imported by `src/middleware.ts`. It uses Web Crypto (`crypto.subtle`) for HMAC verification and has zero `node:` imports. `src/lib/auth.ts` re-exports `COOKIE_NAME` from `auth-edge` and adds Node-only helpers (`issueToken`, `checkCreds`, `verifyToken`) built on `node:crypto`. **Do not import from `@/lib/auth` in middleware** — webpack cannot bundle `node:crypto` for the edge runtime and the dev server will fail with `UnhandledSchemeError`.

Cookie format: `<encoded-username>.<exp-ms>.<hmac-sha256-sig-base64url>`, 30-day TTL, HttpOnly + SameSite=Lax. Issued by `POST /api/login`, cleared by `DELETE /api/login`.

### Database

`src/lib/db.ts` opens `better-sqlite3` once per Node process (cached on `globalThis.__paintooDb`) and creates the `designs` table on first open. One table, schema-on-open — no migration system. Layer bitmaps are stored as a JSON string of `{id, name, visible, opacity, dataUrl}` in the `layers` column; `thumbnail` is a flattened 0.4× PNG data URL. `next.config.mjs` puts `better-sqlite3` in `serverExternalPackages` so it isn't bundled.

### Canvas editor (`src/app/canvas/[id]/`)

The editor mixes React state with imperative DOM/canvas mutation. The split matters for performance and for understanding why edits seem to bypass React:

- **State drives the UI chrome only** — active tool, brush kind, slider values, modal open/closed, theme, palette, the layer list (id/name/visible/opacity).
- **Refs hold the drawing engine** — `layersRef.current` is an array of `{canvas, ctx, thumb, thumbCtx, id, name, visible, opacity}` where `canvas` is a real `<canvas>` element appended to `wrapRef` by `mountLayers()`. React never owns those canvases. Strokes, shapes, fills, and text all write directly into `layer.ctx` and do not trigger re-renders.
- **Mutation refs mirror state** — `toolRef`, `brushKindRef`, `brushRef`, `shapeRef`, `textRef`, `colorRef`, `histIdxRef`. The pointer/keyboard handlers read these (not state) so that closures registered once stay correct across renders. Whenever you add a new piece of UI state that the engine needs, also mirror it into a ref with a `useEffect`.
- **History** is an array of `{undo, redo}` closures. `commitEdit(label, paintFn)` snapshots `ImageData` before/after and pushes a history entry; structural ops (add/dup/move/delete layer, visibility toggle, opacity, rename) push their own. Capped at 50 entries.
- **Layer thumbnails** are tiny offscreen canvases owned by the layer object. `RightPanel`'s `LayerRow` mounts the thumb canvas directly into a host div via `appendChild` — React never re-mounts it.
- **Save** (`onSave` in `CanvasEditor`) serializes every layer's main canvas with `toDataURL('image/png')` and PATCHes the design. Layers can get large; expect multi-MB payloads on big canvases.

The editor is intentionally one big component (`CanvasEditor.tsx`) plus dumb subcomponents (`TopBar`, `LeftPanel`, `RightPanel`, `Modals`). The core drawing math lives in `src/lib/editorCore.ts` (color conversions, brush stamps for the 5 brush kinds, scanline flood fill) and is pure — no DOM, no React.

### Design tokens

All colors are CSS variables in `src/app/globals.css` (oklch values), keyed off `:root[data-theme="dark|light"]`. `tailwind.config.ts` maps them to Tailwind color names so `bg-panel`, `text-ink`, `border-line` work — but most of the codebase uses the arbitrary-value form `bg-[color:var(--panel)]` instead. The theme is set pre-paint by an inline script in `src/app/layout.tsx` that reads `localStorage['paintoo-theme']`.

### Routing & data flow

App Router only. Server components fetch from `src/lib/db.ts` directly (no API hop) — `src/app/page.tsx` for the gallery and `src/app/canvas/[id]/page.tsx` for the editor. Client mutations go through `/api/designs/*`. `dynamic = "force-dynamic"` is set on pages that touch the DB so Next doesn't try to statically render them.

## Notes for future changes

- The original HTML prototype this was ported from is not in the repo. If you need to match a behavior exactly, ask the user for the source bundle rather than guessing.
- `useLayoutEffect` is used for the one-time layer initialization to avoid a flash before canvases mount. The `initedRef` guard is there because React Strict Mode double-invokes effects in dev.
- Keyboard shortcuts (`B`, `E`, `[`, `]`, `⌘Z`, etc.) are bound at the window level inside `CanvasEditor`. They early-return when the focus is on an input/textarea/contenteditable so layer rename and the file name input don't get hijacked.
