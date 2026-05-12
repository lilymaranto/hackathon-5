"use client";

import { PlanTimelineSelect } from "@/components/PlanTimelineSelect";
import {
  INDUSTRY_OPTIONS,
  PLAN_PACKAGE_FOR_AI_DECISIONING_STUDIO,
  PRODUCT_OPTIONS,
} from "@/lib/constants";
import { ConfigRecord, IndustryType, PlanOptionId, ProductType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  config: ConfigRecord;
};

export function ConfigEditForm({ config }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(config.Title);
  const [productType, setProductType] = useState<ProductType>(config.Product_Type);
  const [industry, setIndustry] = useState<IndustryType>(config.Industry);
  const [planOptionId, setPlanOptionId] = useState<PlanOptionId>(config.planOptionId);
  const [password, setPassword] = useState(config.Password);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAiDecisioningStudio = productType === "AI Decisioning Studio";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/configs/${config.Config_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        productType,
        industry,
        password,
        planOptionId: isAiDecisioningStudio ? PLAN_PACKAGE_FOR_AI_DECISIONING_STUDIO : planOptionId,
      }),
    });

    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to save config.");
      return;
    }

    router.push("/employee/configs");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#d7ccf6] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#2c1650]">Edit Config</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#2c1650]">
          Title <span className="text-[#cf3a50]">*</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-sm font-normal outline-none focus:border-[#8b30e7]"
            placeholder="Title"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#2c1650]">
          Industry <span className="text-[#cf3a50]">*</span>
          <select
            value={industry}
            onChange={(event) => setIndustry(event.target.value as IndustryType)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-sm font-normal outline-none focus:border-[#8b30e7]"
          >
            {INDUSTRY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#2c1650]">
          Braze Product <span className="text-[#cf3a50]">*</span>
          <select
            value={productType}
            onChange={(event) => {
              const next = event.target.value as ProductType;
              setProductType(next);
              if (next === "AI Decisioning Studio") {
                setPlanOptionId(PLAN_PACKAGE_FOR_AI_DECISIONING_STUDIO);
              } else {
                setPlanOptionId((prev) =>
                  prev === "ai_decisioning_studio" ? "12_week" : prev,
                );
              }
            }}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-sm font-normal outline-none focus:border-[#8b30e7]"
          >
            {PRODUCT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {!isAiDecisioningStudio && (
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#2c1650]">
            Plan Package <span className="text-[#cf3a50]">*</span>
            <PlanTimelineSelect value={planOptionId} onChange={setPlanOptionId} size="sm" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-semibold text-[#2c1650] md:col-span-2">
          Password
          <input
            maxLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-sm font-normal outline-none focus:border-[#8b30e7]"
            placeholder="Password (optional)"
          />
          <span className="text-xs font-normal text-[#6b5798]">
            Optional. If blank on create, password defaults to title lowercase with no spaces.
          </span>
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-[#cf3a50]">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/employee/configs")}
          className="rounded-md border border-[#d4c9f6] px-4 py-2 text-sm font-semibold text-[#4a2b7a]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Config"}
        </button>
      </div>
    </form>
  );
}
