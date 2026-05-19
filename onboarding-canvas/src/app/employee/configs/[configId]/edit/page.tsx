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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-8">
      <ConfigEditForm config={config} />
    </main>
  );
}
