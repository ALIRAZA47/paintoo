import { listDesigns } from "@/lib/db";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const designs = listDesigns();
  return <HomeClient initialDesigns={designs} />;
}
