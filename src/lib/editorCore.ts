/* Pure helpers for the canvas editor. */

export type HSL = { h: number; s: number; l: number };
export type Point = { x: number; y: number; p?: number };

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0,
    h = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function hexToRgb(hex: string): [number, number, number] | null {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

export function hslToHsv(h: number, s: number, l: number): [number, number, number] {
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return [h, sv, v];
}

export function hsvToHsl(h: number, s: number, v: number): [number, number, number] {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return [h, sl, l];
}

/* ── flood fill (scanline) ───────────────────────────────────────────── */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sx: number,
  sy: number,
  fillRgba: [number, number, number, number],
  tolerance = 16,
): void {
  sx = Math.floor(sx);
  sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const idx0 = (sy * w + sx) * 4;
  const tr = data[idx0],
    tg = data[idx0 + 1],
    tb = data[idx0 + 2],
    ta = data[idx0 + 3];
  const [fr, fg, fb, fa] = fillRgba;
  if (
    Math.abs(tr - fr) < 2 &&
    Math.abs(tg - fg) < 2 &&
    Math.abs(tb - fb) < 2 &&
    Math.abs(ta - fa) < 2
  )
    return;
  const tol2 = tolerance * tolerance;
  const match = (i: number): boolean => {
    const dr = data[i] - tr,
      dg = data[i + 1] - tg,
      db = data[i + 2] - tb,
      da = data[i + 3] - ta;
    return dr * dr + dg * dg + db * db + da * da <= tol2;
  };
  const stack: [number, number][] = [[sx, sy]];
  while (stack.length) {
    const [x0, y0] = stack.pop()!;
    let xL = x0;
    let i = (y0 * w + xL) * 4;
    while (xL >= 0 && match(i)) {
      xL--;
      i -= 4;
    }
    xL++;
    let xR = x0;
    i = (y0 * w + xR) * 4;
    while (xR < w && match(i)) {
      xR++;
      i += 4;
    }
    xR--;
    let aboveAdded = false,
      belowAdded = false;
    for (let x = xL; x <= xR; x++) {
      const ii = (y0 * w + x) * 4;
      data[ii] = fr;
      data[ii + 1] = fg;
      data[ii + 2] = fb;
      data[ii + 3] = fa;
      if (y0 > 0) {
        const upI = ((y0 - 1) * w + x) * 4;
        if (match(upI)) {
          if (!aboveAdded) {
            stack.push([x, y0 - 1]);
            aboveAdded = true;
          }
        } else {
          aboveAdded = false;
        }
      }
      if (y0 < h - 1) {
        const dnI = ((y0 + 1) * w + x) * 4;
        if (match(dnI)) {
          if (!belowAdded) {
            stack.push([x, y0 + 1]);
            belowAdded = true;
          }
        } else {
          belowAdded = false;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ── brush kinds ─────────────────────────────────────────────────────── */
export type BrushKind =
  | "pencil"
  | "graphite"
  | "marker"
  | "ink"
  | "watercolor"
  | "spray"
  | "charcoal"
  | "calligraphy";

export type BrushParams = {
  size: number;
  opacity: number;
  flow: number;
  smoothing: number;
  kind: BrushKind;
  rgb: [number, number, number];
  erase: boolean;
};

export function drawBrushSegment(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  params: BrushParams,
): void {
  const { kind, rgb, erase } = params;
  const baseSize = params.size;
  const op = params.opacity;
  const flow = params.flow;
  const pressure = a.p != null && b.p != null ? (a.p + b.p) / 2 : 1;
  const alpha = op * flow;
  const [r, g, bl] = rgb;
  const hex = `rgb(${r},${g},${bl})`;

  ctx.save();
  if (erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = baseSize * (pressure > 0 ? pressure : 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.globalCompositeOperation = "source-over";

  switch (kind) {
    case "pencil": {
      ctx.globalAlpha = alpha * (0.55 + 0.45 * pressure);
      ctx.strokeStyle = hex;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(0.5, baseSize * (0.45 + 0.55 * pressure));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, dist / 3);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const x = a.x + dx * t + (Math.random() - 0.5) * baseSize * 0.4;
        const y = a.y + dy * t + (Math.random() - 0.5) * baseSize * 0.4;
        ctx.globalAlpha = alpha * 0.08 * Math.random();
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 0.6, 0.6);
      }
      break;
    }
    case "graphite": {
      // Heavy-grain graphite pencil: no underlying solid stroke, just dense
      // angular dashes scattered along the path. Mimics the way a pencil
      // lays down graphite on paper — the paper shows through.
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 1.4));
      const angle = dist > 0.01 ? Math.atan2(dy, dx) : 0;
      const baseAlpha = alpha * (0.32 + 0.55 * pressure);
      const widthFactor = 0.45 + 0.55 * pressure;
      ctx.fillStyle = hex;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const cx = a.x + dx * t;
        const cy = a.y + dy * t;
        const dotCount = Math.max(2, Math.floor(baseSize * 0.55));
        for (let k = 0; k < dotCount; k++) {
          // Gaussian-ish radial offset weighted toward center, with the
          // long axis aligned to the stroke direction.
          const r = Math.pow(Math.random(), 1.4) * baseSize * 0.55 * widthFactor;
          const oa = Math.random() * Math.PI * 2;
          const px = cx + Math.cos(oa) * r;
          const py = cy + Math.sin(oa) * r;
          ctx.globalAlpha = baseAlpha * (0.18 + Math.random() * 0.55);
          // Tiny dashes rotated along the stroke for the scratchy look.
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(angle + (Math.random() - 0.5) * 0.7);
          const w = 0.8 + Math.random() * 1.6;
          const h = 0.35 + Math.random() * 0.55;
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.restore();
        }
      }
      break;
    }
    case "marker": {
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = hex;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = baseSize;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "ink": {
      // Sharp pen: full alpha (no buildup on overlap), thin width modulated
      // by pressure. Good for line work and contour drawing.
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = hex;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(0.4, baseSize * (0.22 + 0.78 * pressure));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "watercolor": {
      ctx.globalAlpha = alpha * 0.1 * (0.8 + 0.4 * pressure);
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / (baseSize * 0.18)));
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = a.x + dx * t,
          y = a.y + dy * t;
        const rad = baseSize * 0.5 * (0.9 + 0.2 * Math.random());
        const g0 = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g0.addColorStop(0, `rgba(${r},${g},${bl},1)`);
        g0.addColorStop(0.5, `rgba(${r},${g},${bl},0.4)`);
        g0.addColorStop(1, `rgba(${r},${g},${bl},0)`);
        ctx.fillStyle = g0;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "spray": {
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 2));
      const density = Math.max(2, Math.floor(baseSize * 0.7 * flow));
      ctx.fillStyle = hex;
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = a.x + dx * t,
          y = a.y + dy * t;
        for (let k = 0; k < density; k++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.pow(Math.random(), 1.3) * baseSize * 0.5;
          const px = x + Math.cos(ang) * rad;
          const py = y + Math.sin(ang) * rad;
          ctx.globalAlpha = alpha * 0.18;
          ctx.fillRect(px, py, 1, 1);
        }
      }
      break;
    }
    case "charcoal": {
      // Soft dusty charcoal: round particles with varied radii, low per-stamp
      // alpha so overlapping strokes build up like real charcoal on paper.
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 1.2));
      const baseAlpha = alpha * (0.18 + 0.55 * pressure);
      ctx.fillStyle = hex;
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        const dotCount = Math.max(3, Math.floor(baseSize * 0.55));
        for (let k = 0; k < dotCount; k++) {
          // Wider spread than graphite, more "dusty"
          const rad = Math.pow(Math.random(), 0.65) * baseSize * 0.6;
          const oa = Math.random() * Math.PI * 2;
          const px = x + Math.cos(oa) * rad;
          const py = y + Math.sin(oa) * rad;
          ctx.globalAlpha = baseAlpha * (0.18 + Math.random() * 0.55);
          const r = 0.5 + Math.random() * 1.8;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "calligraphy": {
      const angle = -Math.PI / 4;
      const nibW = baseSize;
      const nibH = Math.max(1, baseSize * 0.22);
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, nibH * 0.8)));
      ctx.globalAlpha = alpha * (0.6 + 0.4 * pressure);
      ctx.fillStyle = hex;
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = a.x + dx * t,
          y = a.y + dy * t;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillRect(-nibW / 2, -nibH / 2, nibW, nibH);
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}
