"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function GuestPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/configs/by-password?password=${encodeURIComponent(password)}`);
    const payload = (await response.json()) as {
      data?: { Config_ID: string };
      error?: string;
    };
    setLoading(false);

    if (!response.ok || !payload.data) {
      setError(payload.error ?? "No matching config found.");
      return;
    }
    router.push(`/config/${payload.data.Config_ID}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-[#d8ccff] bg-white/90 p-8 shadow-[0_20px_70px_-40px_rgba(85,25,130,0.55)]"
      >
        <h1 className="text-2xl font-semibold text-[#2c1650]">Guest Access</h1>
        <p className="mt-2 text-sm text-[#5D4A86]">
          Enter your onboarding plan password to open the timeline. You can drag tiles and use{" "}
          <strong className="font-semibold text-[#4c2b7f]">Save layout</strong> to persist changes.
        </p>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-4 w-full rounded-lg border border-[#d4c9f6] px-3 py-2 text-sm outline-none focus:border-[#8b30e7]"
          placeholder="Password"
        />
        {error && <p className="mt-2 text-sm text-[#cf3a50]">{error}</p>}
        <button
          type="submit"
          disabled={!password.trim() || loading}
          className="mt-4 rounded-md bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : "Open Config"}
        </button>
      </form>
    </main>
  );
}
