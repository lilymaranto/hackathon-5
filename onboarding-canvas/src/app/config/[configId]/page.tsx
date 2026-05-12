import { CanvasBoard } from "@/components/CanvasBoard";
import { formatConfigPlanHeading } from "@/lib/constants";
import { ConfigRecord, TileRecord } from "@/lib/types";
import { notFound } from "next/navigation";

async function getConfigs() {
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/configs`, { cache: "no-store" });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: ConfigRecord[] };
  return payload.data ?? [];
}

async function getTiles(configId: string) {
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/tiles?configId=${configId}`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: TileRecord[] };
  return payload.data ?? [];
}

export default async function PublicConfigPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  const configs = await getConfigs();
  const config = configs.find((item) => item.Config_ID === configId);
  if (!config) notFound();
  const tiles = await getTiles(configId);
  const planTitle = formatConfigPlanHeading(config);

  return (
    <main className="mx-auto flex min-h-screen w-[90vw] max-w-none flex-col gap-4 p-4 md:p-6">
      <header className="px-1 text-center">
        <h1 className="text-3xl font-semibold text-[#2b1650]">{planTitle}</h1>
      </header>
      <CanvasBoard config={config} tiles={tiles} />
    </main>
  );
}
