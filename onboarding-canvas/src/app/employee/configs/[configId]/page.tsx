import { CanvasBoard } from "@/components/CanvasBoard";
import { formatConfigPlanHeading } from "@/lib/constants";
import { fetchConfigById } from "@/lib/caboodle";
import { TileRecord, GanttTaskRecord } from "@/lib/types";
import { notFound } from "next/navigation";

async function getTiles(configId: string) {
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/tiles?configId=${configId}`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: TileRecord[] };
  return payload.data ?? [];
}

async function getGanttTasks(configId: string) {
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/gantt-tasks?configId=${configId}`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: GanttTaskRecord[] };
  return payload.data ?? [];
}

export default async function EmployeeConfigPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  const config = await fetchConfigById(configId);
  if (!config) notFound();
  const tiles = await getTiles(configId);
  const ganttTasks = await getGanttTasks(configId);
  const planTitle = formatConfigPlanHeading(config);

  return (
    <main className="mx-auto flex min-h-screen w-[95vw] max-w-none flex-col gap-4 px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3">
      <CanvasBoard
        config={config}
        tiles={tiles}
        ganttTasks={ganttTasks}
        topToolbarBackHref="/employee/configs"
        topToolbarTitle={planTitle}
      />
    </main>
  );
}
