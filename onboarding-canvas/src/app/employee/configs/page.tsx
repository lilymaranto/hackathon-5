import { ConfigsMineToggle } from "@/components/ConfigsMineToggle";
import { ConfigsSearchForm } from "@/components/ConfigsSearchForm";
import { ConfigsTable } from "@/components/ConfigsTable";
import { ConfigRecord } from "@/lib/types";
import { headers } from "next/headers";
import Link from "next/link";

async function getConfigs(search?: string, mine?: boolean) {
  const headerList = await headers();
  /** Same host as the browser request so session cookies apply (AUTH_URL may point at another origin in dev). */
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (mine) params.set("mine", "1");
  const qs = params.toString();

  const response = await fetch(`${baseUrl}/api/configs${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: {
      cookie: headerList.get("cookie") ?? "",
    },
  });

  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: unknown[] };
  return (payload.data ?? []) as ConfigRecord[];
}

export default async function EmployeeConfigsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; mine?: string }>;
}) {
  const { search, mine } = await searchParams;
  const configs = await getConfigs(search, mine === "1");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-[#2c1650]">Configurations</h1>
          <Link
            href="/employee/configs/create"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Create Config
          </Link>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <ConfigsMineToggle />
          <ConfigsSearchForm search={search} mine={mine === "1"} />
        </div>
      </header>

      <ConfigsTable configs={configs} />
    </main>
  );
}
