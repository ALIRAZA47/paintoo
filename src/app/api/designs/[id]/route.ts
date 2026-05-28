import { NextResponse } from "next/server";
import { deleteDesign, getDesign, updateDesign } from "@/lib/db";

export const runtime = "nodejs";

function parseId(p: string): number | null {
  const n = Number(p);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pid } = await params;
  const id = parseId(pid);
  if (id == null) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const design = getDesign(id);
  if (!design) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ design });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pid } = await params;
  const id = parseId(pid);
  if (id == null) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Parameters<typeof updateDesign>[1] = {};
  if (typeof body.name === "string") patch.name = body.name.trim() || "untitled";
  if (typeof body.thumbnail === "string" || body.thumbnail === null) patch.thumbnail = body.thumbnail;
  if (typeof body.layers === "string") patch.layers = body.layers;
  if (typeof body.palette === "string" || body.palette === null) patch.palette = body.palette;

  const design = updateDesign(id, patch);
  if (!design) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ design });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pid } = await params;
  const id = parseId(pid);
  if (id == null) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const ok = deleteDesign(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
