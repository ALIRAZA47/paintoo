import { NextResponse } from "next/server";
import { createDesign, listDesigns } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const designs = await listDesigns();
  return NextResponse.json({ designs });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "untitled";
  const width = Math.max(16, Math.min(8000, Number(body.width) || 1600));
  const height = Math.max(16, Math.min(8000, Number(body.height) || 1000));
  const bg = typeof body.bg === "string" ? body.bg : "#FFFFFF";
  const layers = typeof body.layers === "string" ? body.layers : JSON.stringify([]);
  const thumbnail = typeof body.thumbnail === "string" ? body.thumbnail : null;
  const palette = typeof body.palette === "string" ? body.palette : null;

  const design = await createDesign({ name, width, height, bg, layers, thumbnail, palette });
  return NextResponse.json({ design });
}
