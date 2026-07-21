"use client";

import { InstantTooltip } from "@/components/InstantTooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

function ConfigsMineToggleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mine = searchParams.get("mine") === "1";
  const search = searchParams.get("search") ?? "";

  const apply = useCallback(
    (nextMine: boolean) => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (nextMine) params.set("mine", "1");
      const qs = params.toString();
      router.push(`/employee/configs${qs ? `?${qs}` : ""}`);
    },
    [router, search],
  );

  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-base font-medium text-[#2c1650] whitespace-nowrap">
      <InstantTooltip label="Only show configs you created">
        <input
          type="checkbox"
          checked={mine}
          onChange={(event) => apply(event.target.checked)}
          aria-label="Only show configs you created"
          className="h-[18px] w-[18px] shrink-0 rounded border-[#c4b8e8] text-[#801ED7] accent-[#801ED7] focus:ring-2 focus:ring-[#801ED7]/30"
        />
      </InstantTooltip>
      Only show mine
    </label>
  );
}

export function ConfigsMineToggle() {
  return (
    <Suspense
      fallback={<div className="h-10 w-40 shrink-0 animate-pulse rounded bg-[#f0ebfa]" aria-hidden />}
    >
      <ConfigsMineToggleInner />
    </Suspense>
  );
}
