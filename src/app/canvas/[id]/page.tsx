import { notFound } from "next/navigation";
import { getDesign } from "@/lib/db";
import CanvasEditor from "./CanvasEditor";

export const dynamic = "force-dynamic";

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pid } = await params;
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const design = await getDesign(id);
  if (!design) notFound();

  let layers: Array<{ id: string; name: string; visible: boolean; opacity: number; dataUrl: string | null }> = [];
  try {
    const parsed = JSON.parse(design.layers);
    if (Array.isArray(parsed)) layers = parsed;
  } catch {}
  let palette: string[] | null = null;
  if (design.palette) {
    try {
      const p = JSON.parse(design.palette);
      if (Array.isArray(p)) palette = p;
    } catch {}
  }

  return (
    <CanvasEditor
      design={{
        id: design.id,
        name: design.name,
        width: design.width,
        height: design.height,
        bg: design.bg,
        layers,
        palette,
      }}
    />
  );
}
