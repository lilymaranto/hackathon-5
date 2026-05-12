import { ConfigCreateForm } from "@/components/ConfigCreateForm";
import { ConfigsMineToggle } from "@/components/ConfigsMineToggle";
import { authOptions } from "@/lib/auth-options";
import { ConfigsTable } from "@/components/ConfigsTable";
import { ConfigRecord } from "@/lib/types";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
  const session = await getServerSession(authOptions);
  if (!session) redirect("/employee/signin");

  const { search, mine } = await searchParams;
  const configs = await getConfigs(search, mine === "1");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-[#2c1650]">Configurations</h1>
          <ConfigCreateForm />
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <ConfigsMineToggle />
          <form
            method="GET"
            action="/employee/configs"
            className="flex w-full min-w-0 justify-end sm:w-auto sm:flex-none"
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                name="search"
                defaultValue={search ?? ""}
                placeholder="Search configs"
                className="min-w-0 w-[14.65rem] rounded-full border border-[#d4c9f6] bg-white px-4 py-2.5 text-base outline-none focus:border-[#8b30e7] sm:w-[17.35rem]"
              />
              {mine === "1" ? <input type="hidden" name="mine" value="1" /> : null}
              <button
                type="submit"
                title="Search configs by account title"
                aria-label="Search configs by account title"
                className="shrink-0 rounded-full border border-[#8b30e7] px-5 py-2.5 text-base font-semibold text-[#8b30e7] hover:bg-[#f2e8ff]"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </header>

      <ConfigsTable configs={configs} />
    </main>
  );
}
