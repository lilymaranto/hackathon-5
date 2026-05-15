import { ConfigCreatePageForm } from "@/components/ConfigCreatePageForm";

export default function CreateConfigPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 p-8">
      <header className="rounded-xl border border-[#C9C4EF] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#300266]">Create Config</h1>
        <p className="mt-1 text-sm text-[#5D4A86]">Set up a new onboarding config and seed timeline tiles.</p>
      </header>
      <ConfigCreatePageForm />
    </main>
  );
}
