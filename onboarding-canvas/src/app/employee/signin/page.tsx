"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EmployeeSignInPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/employee/configs");
    }
  }, [router, status]);

  if (status === "authenticated") {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#f5e9ff_0%,#fff3f8_45%,#fffaf1_100%)] p-6">
      <section className="w-full max-w-3xl rounded-3xl border border-[#dcccf8] bg-white/90 p-10 shadow-[0_20px_80px_-45px_rgba(98,33,157,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c61af]">
          Braze Internal
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-[#28134d]">Onboarding Canvas</h1>
        <p className="mt-3 max-w-xl text-sm text-[#5e478f]">
          Sign in with your Braze Google account to manage onboarding configs. If you are already
          signed into Google, this should only take a moment.
        </p>
        <button
          disabled={status === "loading"}
          onClick={() => void signIn("google", { callbackUrl: "/employee/configs" })}
          className="mt-6 rounded-full bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Sign in with Google
        </button>
      </section>
    </main>
  );
}
