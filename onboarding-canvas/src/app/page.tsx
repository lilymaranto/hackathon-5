import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f5ebff_0%,#fef3f7_38%,#f8f7fd_100%)]">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center p-8">
        <section className="w-full max-w-3xl rounded-3xl border border-[#d8ccff] bg-white/85 p-10 shadow-[0_20px_70px_-40px_rgba(85,25,130,0.55)] backdrop-blur-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7c61af]">
            Braze Onboarding Workspace
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-[#28134d]">
            Dynamic onboarding plans, built for live collaboration.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#5e478f]">
            Launch polished kickoff timelines with dynamic clickable tiles, editable workstreams,
            and account-level onboarding views.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/employee/signin"
              className="rounded-full bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Braze Employee Sign In
            </Link>
            <Link
              href="/guest"
              className="rounded-full border border-[#ccbaf5] bg-white px-6 py-3 text-base font-semibold text-[#4c2b7f] transition hover:bg-[#f7f1ff]"
            >
              I&apos;m a Guest
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
