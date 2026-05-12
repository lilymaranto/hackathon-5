import { CanvasBoard } from "@/components/CanvasBoard";
import { authOptions } from "@/lib/auth-options";
import { formatConfigPlanHeading } from "@/lib/constants";
import { ConfigRecord, TileRecord } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

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

export default async function EmployeeConfigPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/employee/signin");

  const { configId } = await params;
  const configs = await getConfigs();
  const config = configs.find((item) => item.Config_ID === configId);
  if (!config) notFound();
  const tiles = await getTiles(configId);
  const planTitle = formatConfigPlanHeading(config);

  return (
    <main className="mx-auto flex min-h-screen w-[90vw] max-w-none flex-col gap-4 p-4 md:p-6">
      <header className="relative flex items-start justify-center gap-3 px-1">
        <Link
          href="/employee/configs"
          className="absolute left-0 top-1 z-10 inline-flex shrink-0 rounded-lg border border-[#d7ccf6] bg-white p-2 text-[#4c2b7f] shadow-sm transition hover:bg-[#f6efff]"
          aria-label="Back to all configs"
          title="Back to all configs"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
        <h1 className="mx-auto max-w-[min(100%,52rem)] px-12 text-center text-3xl font-semibold text-[#2b1650] md:px-14">
          {planTitle}
        </h1>
      </header>
      <CanvasBoard config={config} tiles={tiles} />
    </main>
  );
}
