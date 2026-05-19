"use client";

import { ConfigBrandAssetsSection } from "@/components/ConfigBrandAssetsSection";
import type { BrandColorFieldId } from "@/lib/brand-color-drag";
import { ConfigTileCategoryColorPickers } from "@/components/ConfigTileCategoryColorPickers";
import { ConfigWorkstreamGradientColorPickers } from "@/components/ConfigWorkstreamGradientColorPickers";
import { PlanTimelineSelect } from "@/components/PlanTimelineSelect";
import { INDUSTRY_OPTIONS, PRODUCT_OPTIONS } from "@/lib/constants";
import {
  BRAND_EXTRACT_CREATE_SCOPE,
  clearBrandExtractSession,
  migrateBrandExtractSession,
} from "@/lib/brand-extract-session";
import { generateRandomPassword } from "@/lib/password";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import { IndustryType, PlanOptionId, ProductType } from "@/lib/types";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useLayoutEffect, useState } from "react";

export function ConfigCreatePageForm() {
  const router = useRouter();

  useLayoutEffect(() => {
    clearBrandExtractSession(BRAND_EXTRACT_CREATE_SCOPE);
  }, []);
  const [title, setTitle] = useState("");
  const [productType, setProductType] = useState<ProductType>("Braze Core");
  const [industry, setIndustry] = useState<IndustryType>("Retail & eCommerce");
  const [planOptionId, setPlanOptionId] = useState<PlanOptionId>("12_week");
  const [password, setPassword] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(true);
  const [channelWhatsapp, setChannelWhatsapp] = useState(true);
  const [channelInProduct, setChannelInProduct] = useState(true);
  const [onboardingSessionTileColor, setOnboardingSessionTileColor] = useState("");
  const [customerActivityTileColor, setCustomerActivityTileColor] = useState("");
  const [buttonColor, setButtonColor] = useState("");
  const [workstreamGradientTopColor, setWorkstreamGradientTopColor] = useState("");
  const [workstreamGradientBottomColor, setWorkstreamGradientBottomColor] = useState("");
  const [timelineStartDate, setTimelineStartDate] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");

  const canSubmit = title.trim() && industry && productType;
  const isAiDecisioningStudio = productType === "AI Decisioning Studio";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);

    const ob = onboardingSessionTileColor.trim();
    const cb = customerActivityTileColor.trim();
    const btn = buttonColor.trim();
    const wst = workstreamGradientTopColor.trim();
    const wsb = workstreamGradientBottomColor.trim();

    if (ob && !parseHexColorOptional(ob)) {
      setIsSaving(false);
      setError("Onboarding Session color must be a hex value like #300266.");
      return;
    }
    if (cb && !parseHexColorOptional(cb)) {
      setIsSaving(false);
      setError(`${title.trim() || "Prospect"} Activity color must be a hex value like #c9c4ef.`);
      return;
    }
    if (btn && !parseHexColorOptional(btn)) {
      setIsSaving(false);
      setError("Toolbar button color must be a hex value like #801ed7.");
      return;
    }
    if (!isAiDecisioningStudio) {
      if (wst && !parseHexColorOptional(wst)) {
        setIsSaving(false);
        setError("Workstream gradient top color must be a hex value like #300266.");
        return;
      }
      if (wsb && !parseHexColorOptional(wsb)) {
        setIsSaving(false);
        setError("Workstream gradient bottom color must be a hex value like #801ed7.");
        return;
      }
    }

    const onboardingHex = parseHexColorOptional(ob);
    const customerHex = parseHexColorOptional(cb);
    const buttonHex = parseHexColorOptional(btn);
    const wsTopHex = !isAiDecisioningStudio ? parseHexColorOptional(wst) : undefined;
    const wsBottomHex = !isAiDecisioningStudio ? parseHexColorOptional(wsb) : undefined;

    const response = await fetch("/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        productType,
        industry,
        ...(isAiDecisioningStudio ? {} : { planOptionId }),
        password,
        channels: {
          email: channelEmail,
          sms: channelSms,
          whatsapp: channelWhatsapp,
          inProductMessaging: channelInProduct,
        },
        ...(onboardingHex ? { onboardingSessionTileColor: onboardingHex } : {}),
        ...(customerHex ? { customerActivityTileColor: customerHex } : {}),
        ...(buttonHex ? { buttonColor: buttonHex } : {}),
        ...(!isAiDecisioningStudio && wsTopHex && wsBottomHex
          ? {
              workstreamGradientTopColor: wsTopHex,
              workstreamGradientBottomColor: wsBottomHex,
            }
          : {}),
        ...(logoDataUrl.trim() ? { logoDataUrl: logoDataUrl.trim() } : {}),
        ...(timelineStartDate.trim() ? { timelineStartDate: timelineStartDate.trim() } : {}),
      }),
    });

    const payload = (await response.json()) as { data?: { Config_ID: string }; error?: string };
    setIsSaving(false);
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Unable to create config.");
      return;
    }

    migrateBrandExtractSession(BRAND_EXTRACT_CREATE_SCOPE, payload.data.Config_ID);

    router.push(`/employee/configs/${payload.data.Config_ID}`);
    router.refresh();
  }

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#d7ccf6] bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#300266]">Create Config</h1>
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
            onChange={(event) => setProductType(event.target.value as ProductType)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7]"
          >
            {PRODUCT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {!isAiDecisioningStudio ? (
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650]">
            <span className="inline-flex w-fit items-center gap-0.5">
              Plan Package <span className="text-[#cf3a50]">*</span>
            </span>
            <PlanTimelineSelect value={planOptionId} onChange={setPlanOptionId} size="sm" />
          </label>
        ) : null}
        <fieldset className="rounded-md border border-[#e8dff9] bg-[#faf8ff] p-3 md:col-span-2">
          <legend className="px-1 text-xs font-semibold text-[#2c1650]">Channels</legend>
          <div className="grid gap-2 text-xs text-[#2c1650] sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} className="h-4 w-4 rounded border-[#c4b8e8] accent-[#801ED7]" />
              Email
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={channelSms} onChange={(e) => setChannelSms(e.target.checked)} className="h-4 w-4 rounded border-[#c4b8e8] accent-[#801ED7]" />
              SMS
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={channelWhatsapp} onChange={(e) => setChannelWhatsapp(e.target.checked)} className="h-4 w-4 rounded border-[#c4b8e8] accent-[#801ED7]" />
              WhatsApp
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={channelInProduct} onChange={(e) => setChannelInProduct(e.target.checked)} className="h-4 w-4 rounded border-[#c4b8e8] accent-[#801ED7]" />
              In-product messaging
            </label>
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650] md:col-span-2">
          Password
          <div className="flex flex-wrap items-center gap-2">
            <input
              maxLength={8}
              value={password}
              onChange={(event) => {
                setGenerated(false);
                setPassword(event.target.value);
              }}
              className="min-w-0 flex-1 rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7]"
              placeholder="Password (optional)"
            />
            <button type="button" onClick={() => { setGenerated(true); setPassword(generateRandomPassword(8)); }} className="rounded-md bg-[#4a2b7a] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#3c2262]">Generate</button>
            {generated ? (
              <button type="button" onClick={copyPassword} className="rounded-md border border-[#8b30e7] px-3 py-2 text-[10px] font-semibold text-[#8b30e7] hover:bg-[#f2e8ff]">
                {copied ? <span className="inline-flex items-center gap-1"><Check size={14} strokeWidth={2} />Copied</span> : "Copy"}
              </button>
            ) : null}
          </div>
          <span className="text-[10px] font-normal text-[#6b5798]">Optional. If blank, password defaults to prospect name lowercase with no spaces.</span>
        </label>
      </div>

      <div className="mt-4">
        <ConfigBrandAssetsSection
          brandExtractScope={BRAND_EXTRACT_CREATE_SCOPE}
          timelineStartDate={timelineStartDate}
          onTimelineStartDateChange={setTimelineStartDate}
          logoDataUrl={logoDataUrl}
          logoFileName={logoFileName}
          disabled={isSaving}
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
          disabled={isSaving}
          onboardingSessionTileColor={onboardingSessionTileColor}
          customerActivityTileColor={customerActivityTileColor}
          buttonColor={buttonColor}
          customerActivityColorLabel={title.trim() ? `${title.trim()} Activity` : "Prospect Activity"}
          onChangeOnboarding={setOnboardingSessionTileColor}
          onChangeCustomer={setCustomerActivityTileColor}
          onChangeButton={setButtonColor}
        />
        {!isAiDecisioningStudio ? (
            <ConfigWorkstreamGradientColorPickers
              variant="page"
              disabled={isSaving}
              workstreamGradientTopColor={workstreamGradientTopColor}
              workstreamGradientBottomColor={workstreamGradientBottomColor}
              onChangeTop={setWorkstreamGradientTopColor}
              onChangeBottom={setWorkstreamGradientBottomColor}
            />
        ) : null}
        </ConfigBrandAssetsSection>
      </div>

      {error ? <p className="mt-3 text-xs text-[#cf3a50]">{error}</p> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => router.push("/employee/configs")} className="rounded-md border border-[#d4c9f6] px-3 py-1.5 text-[11px] font-semibold leading-tight text-[#4a2b7a]">Cancel</button>
        <button type="submit" disabled={!canSubmit || isSaving} className="rounded-md bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-3 py-1.5 text-[11px] font-semibold leading-tight text-white disabled:opacity-60">
          {isSaving ? "Creating..." : "Create Config"}
        </button>
      </div>
    </form>
  );
}
