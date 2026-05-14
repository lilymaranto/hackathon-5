import { ConfigEditForm } from "@/components/ConfigEditForm";
import { fetchConfigById } from "@/lib/caboodle";
import { notFound } from "next/navigation";

export default async function EditConfigPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  const config = await fetchConfigById(configId);
  if (!config) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 p-8">
      <header className="rounded-xl border border-[#C9C4EF] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#300266]">{config.Title}</h1>
        <p className="mt-1 text-sm text-[#5D4A86]">Update config metadata and access password.</p>
      </header>
      <ConfigEditForm config={config} />
    </main>
  );
}
