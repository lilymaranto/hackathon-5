"use client";

import { useBrandExtract } from "@/components/brand/brand-extract-context";
import type { BrandExtractPayload } from "@/lib/brand-extract-types";
import { useCallback, useEffect, useState } from "react";

const DOMAIN_PLACEHOLDER =
  "Enter domain without https or www - i.e. 'example.com'";

type Props = {
  disabled?: boolean;
  onError: (message: string | null) => void;
};

export function BrandDomainSearch({ disabled = false, onError }: Props) {
  const { results, setResults } = useBrandExtract();
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (results?.domain) setDomainInput(results.domain);
  }, [results?.domain]);

  const runSearch = useCallback(async () => {
    const domain = domainInput.trim();
    if (!domain || loading) return;
    setLoading(true);
    onError(null);
    try {
      const response = await fetch(
        `/api/brand/extract?domain=${encodeURIComponent(domain)}`,
      );
      const payload = (await response.json()) as {
        data?: BrandExtractPayload;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        onError(payload.error ?? "Could not fetch brand assets.");
        return;
      }
      setResults(payload.data);
      setDomainInput(payload.data.domain);
    } catch {
      onError("Network error while fetching brand assets.");
    } finally {
      setLoading(false);
    }
  }, [domainInput, loading, onError, setResults]);

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-semibold text-[#2c1650]">Search with Domain</label>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
        <input
          type="text"
          value={domainInput}
          disabled={disabled || loading}
          placeholder={DOMAIN_PLACEHOLDER}
          onChange={(e) => setDomainInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-[#d4c9f6] bg-white px-2 py-1.5 text-[11px] font-normal outline-none placeholder:text-[#6b5798] focus:border-[#8b30e7] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || loading || !domainInput.trim()}
          onClick={() => void runSearch()}
          className="shrink-0 rounded-md border border-[#8b30e7] bg-[#f8f4ff] px-3 py-1.5 text-[11px] font-semibold text-[#8b30e7] hover:bg-[#efe6ff] disabled:opacity-50"
        >
          {loading ? "Searching…" : "Enter"}
        </button>
      </div>
    </div>
  );
}
