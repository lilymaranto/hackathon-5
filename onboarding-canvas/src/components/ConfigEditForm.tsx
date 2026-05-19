"use client";

import { ConfigTileCategoryColorPickers } from "@/components/ConfigTileCategoryColorPickers";
import { ConfigBrandAssetsSection } from "@/components/ConfigBrandAssetsSection";
import type { BrandColorFieldId } from "@/lib/brand-color-drag";
import { timelineStartDateFromDates } from "@/lib/timeline-dates";
import { ConfigWorkstreamGradientColorPickers } from "@/components/ConfigWorkstreamGradientColorPickers";
import { PlanTimelineSelect } from "@/components/PlanTimelineSelect";
import {
  INDUSTRY_OPTIONS,
  PLAN_PACKAGE_FOR_AI_DECISIONING_STUDIO,
  PRODUCT_OPTIONS,
} from "@/lib/constants";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
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
  const [onboardingSessionTileColor, setOnboardingSessionTileColor] = useState(
    config.onboardingSessionTileColor ?? "",
  );
  const [customerActivityTileColor, setCustomerActivityTileColor] = useState(
    config.customerActivityTileColor ?? "",
  );
  const [buttonColor, setButtonColor] = useState(config.buttonColor ?? "");
  const [workstreamGradientTopColor, setWorkstreamGradientTopColor] = useState(
    config.workstreamGradientTopColor ?? "",
  );
  const [workstreamGradientBottomColor, setWorkstreamGradientBottomColor] = useState(
    config.workstreamGradientBottomColor ?? "",
  );
  const [timelineStartDate, setTimelineStartDate] = useState(
    timelineStartDateFromDates(config.timelineDates),
  );
  const [logoDataUrl, setLogoDataUrl] = useState(config.logoDataUrl ?? "");
  const [logoFileName, setLogoFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAiDecisioningStudio = productType === "AI Decisioning Studio";

  /** Persist form; returns true when the API save succeeded. */
  async function performSave(): Promise<boolean> {
    setSaving(true);
    setError(null);

    const ob = onboardingSessionTileColor.trim();
    const cb = customerActivityTileColor.trim();
    if (ob && !parseHexColorOptional(ob)) {
      setSaving(false);
      setError("Onboarding Session color must be a hex value like #300266.");
      return false;
    }
    if (cb && !parseHexColorOptional(cb)) {
      setSaving(false);
      setError(
        `${(title.trim() || config.Title).trim() || "Prospect"} Activity color must be a hex value like #c9c4ef.`,
      );
      return false;
    }
    const btn = buttonColor.trim();
    if (btn && !parseHexColorOptional(btn)) {
      setSaving(false);
      setError("Toolbar button color must be a hex value like #801ed7.");
      return false;
    }
    const wst = workstreamGradientTopColor.trim();
    const wsb = workstreamGradientBottomColor.trim();
    if (!isAiDecisioningStudio) {
      if (wst && !parseHexColorOptional(wst)) {
        setSaving(false);
        setError("Workstream gradient top color must be a hex value like #300266.");
        return false;
      }
      if (wsb && !parseHexColorOptional(wsb)) {
        setSaving(false);
        setError("Workstream gradient bottom color must be a hex value like #801ed7.");
        return false;
      }
    }

    const response = await fetch(`/api/configs/${config.Config_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        productType,
        industry,
        password,
        planOptionId: isAiDecisioningStudio ? PLAN_PACKAGE_FOR_AI_DECISIONING_STUDIO : planOptionId,
        onboardingSessionTileColor: parseHexColorOptional(ob) ?? "",
        customerActivityTileColor: parseHexColorOptional(cb) ?? "",
        buttonColor: parseHexColorOptional(btn) ?? "",
        logoDataUrl: logoDataUrl.trim(),
        timelineStartDate: timelineStartDate.trim(),
        ...(!isAiDecisioningStudio
          ? {
              workstreamGradientTopColor: parseHexColorOptional(wst) ?? "",
              workstreamGradientBottomColor: parseHexColorOptional(wsb) ?? "",
            }
          : {}),
      }),
    });

    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Unable to save config.");
      return false;
    }

    return true;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await performSave();
    if (!ok) return;
    router.push("/employee/configs");
    router.refresh();
  }

  async function onSaveAndGo() {
    const ok = await performSave();
    if (!ok) return;
    router.push(`/employee/configs/${config.Config_ID}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#d7ccf6] bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#300266]">
        {(title.trim() || config.Title).trim() || "Prospect"}
      </h1>
      <h2 className="mt-2 text-base font-semibold text-[#2c1650]">Edit Config</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650]">
          <span className="inline-flex w-fit items-center gap-0.5">
            Prospect Name <span className="text-[#cf3a50]">*</span>
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7]"
            placeholder="Prospect Name"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650]">
          <span className="inline-flex w-fit items-center gap-0.5">
            Industry <span className="text-[#cf3a50]">*</span>
          </span>
          <select
            value={industry}
            onChange={(event) => setIndustry(event.target.value as IndustryType)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7]"
          >
            {INDUSTRY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650]">
          <span className="inline-flex w-fit items-center gap-0.5">
            Braze Product <span className="text-[#cf3a50]">*</span>
          </span>
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
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7]"
          >
            {PRODUCT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {!isAiDecisioningStudio && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650]">
            <span className="inline-flex w-fit items-center gap-0.5">
              Plan Package <span className="text-[#cf3a50]">*</span>
            </span>
            <PlanTimelineSelect value={planOptionId} onChange={setPlanOptionId} size="sm" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650] md:col-span-2">
          Password
          <input
            maxLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7]"
            placeholder="Password (optional)"
          />
          <span className="text-[10px] font-normal text-[#6b5798]">
            Optional. If blank on create, password defaults to prospect name lowercase with no spaces.
          </span>
        </label>
      </div>

      <div className="mt-4">
        <ConfigBrandAssetsSection
          brandExtractScope={config.Config_ID}
          timelineStartDate={timelineStartDate}
          onTimelineStartDateChange={setTimelineStartDate}
          logoDataUrl={logoDataUrl}
          logoFileName={logoFileName}
          disabled={saving}
          onChangeLogo={(nextDataUrl, nextFileName) => {
            setLogoDataUrl(nextDataUrl);
            setLogoFileName(nextFileName);
          }}
          onRemoveLogo={() => {
            setLogoDataUrl("");
            setLogoFileName("");
          }}
          onError={setError}
          onApplyColor={(field: BrandColorFieldId, hex) => {
            if (field === "onboarding") setOnboardingSessionTileColor(hex);
            else if (field === "customer") setCustomerActivityTileColor(hex);
            else if (field === "button") setButtonColor(hex);
            else if (field === "workstreamTop") setWorkstreamGradientTopColor(hex);
            else if (field === "workstreamBottom") setWorkstreamGradientBottomColor(hex);
          }}
        >
        <ConfigTileCategoryColorPickers
          variant="page"
          disabled={saving}
          onboardingSessionTileColor={onboardingSessionTileColor}
          customerActivityTileColor={customerActivityTileColor}
          buttonColor={buttonColor}
          customerActivityColorLabel={`${(title.trim() || config.Title).trim() || "Prospect"} Activity`}
          onChangeOnboarding={setOnboardingSessionTileColor}
          onChangeCustomer={setCustomerActivityTileColor}
          onChangeButton={setButtonColor}
        />
        {!isAiDecisioningStudio && (
            <ConfigWorkstreamGradientColorPickers
              variant="page"
              disabled={saving}
              workstreamGradientTopColor={workstreamGradientTopColor}
              workstreamGradientBottomColor={workstreamGradientBottomColor}
              onChangeTop={setWorkstreamGradientTopColor}
              onChangeBottom={setWorkstreamGradientBottomColor}
            />
        )}
        </ConfigBrandAssetsSection>
      </div>

      {error && <p className="mt-3 text-xs text-[#cf3a50]">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/employee/configs")}
          className="rounded-md border border-[#d4c9f6] px-3 py-1.5 text-[11px] font-semibold leading-tight text-[#4a2b7a]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-[#8b30e7] bg-[#f8f4ff] px-3 py-1.5 text-[11px] font-semibold leading-tight text-[#8b30e7] outline-none hover:bg-[#efe6ff] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSaveAndGo}
          className="rounded-md bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Go"}
        </button>
      </div>
    </form>
  );
}
