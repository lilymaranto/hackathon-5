"use client";

import { PlanTimelineSelect } from "@/components/PlanTimelineSelect";
import { INDUSTRY_OPTIONS, PRODUCT_OPTIONS } from "@/lib/constants";
import { generateRandomPassword } from "@/lib/password";
import { IndustryType, PlanOptionId, ProductType } from "@/lib/types";
import clsx from "clsx";
import { Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ConfigCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const canSubmit = title.trim() && industry && productType;
  const isAiDecisioningStudio = productType === "AI Decisioning Studio";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);

    const response = await fetch("/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        productType,
        industry,
        ...(isAiDecisioningStudio
          ? {}
          : { planOptionId }),
        password,
        channels: {
          email: channelEmail,
          sms: channelSms,
          whatsapp: channelWhatsapp,
          inProductMessaging: channelInProduct,
        },
      }),
    });

    const payload = (await response.json()) as { data?: { Config_ID: string }; error?: string };

    setIsSaving(false);
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Unable to create config.");
      return;
    }

    setTitle("");
    setIndustry("Retail & eCommerce");
    setProductType("Braze Core");
    setPlanOptionId("12_week");
    setPassword("");
    setGenerated(false);
    setChannelEmail(true);
    setChannelSms(true);
    setChannelWhatsapp(true);
    setChannelInProduct(true);
    setOpen(false);
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Create a new onboarding account config and seed its timeline tiles"
        aria-label="Create a new onboarding account config and seed its timeline tiles"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
      >
        <Plus size={18} strokeWidth={2} />
        Create Config
      </button>

      <div
        className={clsx(
          "fixed inset-0 z-40 bg-[#120a24]/35 backdrop-blur-[2px] transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={clsx(
          "fixed right-0 top-0 z-50 h-full w-full max-w-xl border-l border-[#d9ccff] bg-[#fcfbff] p-7 shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[#2c1650]">Create Configuration</h2>
            <p className="mt-1 text-base text-[#6b5798]">Set up account details and seed timeline.</p>
          </div>
          <button
            type="button"
            title="Close panel"
            aria-label="Close create configuration panel"
            onClick={() => setOpen(false)}
            className="rounded-md border border-[#d4c9f6] p-2.5 text-[#5f478f] hover:bg-[#f5efff]"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-base font-semibold text-[#2c1650]">
              Account Title <span className="text-[#cf3a50]">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-[#d4c9f6] bg-white px-4 py-2.5 text-base outline-none focus:border-[#8b30e7]"
              placeholder="e.g., Nike"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className={clsx("grid gap-5", !isAiDecisioningStudio && "md:grid-cols-2")}>
            <div>
              <label className="mb-1.5 block text-base font-semibold text-[#2c1650]">
                Braze Product <span className="text-[#cf3a50]">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-[#d4c9f6] bg-white px-4 py-2.5 text-base outline-none focus:border-[#8b30e7]"
                value={productType}
                onChange={(event) => setProductType(event.target.value as ProductType)}
              >
                {PRODUCT_OPTIONS.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            {!isAiDecisioningStudio && (
              <div>
                <label className="mb-1.5 block text-base font-semibold text-[#2c1650]">
                  Plan Package <span className="text-[#cf3a50]">*</span>
                </label>
                <PlanTimelineSelect value={planOptionId} onChange={setPlanOptionId} size="md" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-base font-semibold text-[#2c1650]">
              Industry <span className="text-[#cf3a50]">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-[#d4c9f6] bg-white px-4 py-2.5 text-base outline-none focus:border-[#8b30e7]"
              value={industry}
              onChange={(event) => setIndustry(event.target.value as IndustryType)}
            >
              {INDUSTRY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="rounded-lg border border-[#e8dff9] bg-[#faf8ff] p-4">
            <legend className="px-1 text-base font-semibold text-[#2c1650]">Channels</legend>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-base text-[#2c1650]">
                <input
                  type="checkbox"
                  checked={channelEmail}
                  onChange={(e) => setChannelEmail(e.target.checked)}
                  className="h-[18px] w-[18px] rounded border-[#c4b8e8] accent-[#801ED7]"
                />
                Email
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-base text-[#2c1650]">
                <input
                  type="checkbox"
                  checked={channelSms}
                  onChange={(e) => setChannelSms(e.target.checked)}
                  className="h-[18px] w-[18px] rounded border-[#c4b8e8] accent-[#801ED7]"
                />
                SMS
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-base text-[#2c1650]">
                <input
                  type="checkbox"
                  checked={channelWhatsapp}
                  onChange={(e) => setChannelWhatsapp(e.target.checked)}
                  className="h-[18px] w-[18px] rounded border-[#c4b8e8] accent-[#801ED7]"
                />
                WhatsApp
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-base text-[#2c1650]">
                <input
                  type="checkbox"
                  checked={channelInProduct}
                  onChange={(e) => setChannelInProduct(e.target.checked)}
                  className="h-[18px] w-[18px] rounded border-[#c4b8e8] accent-[#801ED7]"
                />
                In-product messaging
              </label>
            </div>
          </fieldset>

          <div>
            <label className="mb-1.5 block text-base font-semibold text-[#2c1650]">Password</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-[#d4c9f6] bg-white px-4 py-2.5 text-base outline-none focus:border-[#8b30e7]"
                placeholder="Max 8 chars"
                value={password}
                onChange={(event) => {
                  setGenerated(false);
                  setPassword(event.target.value.slice(0, 8));
                }}
              />
              <button
                type="button"
                title="Generate a random 8-character password"
                aria-label="Generate a random 8-character password"
                className="rounded-md bg-[#4a2b7a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3c2262]"
                onClick={() => {
                  setGenerated(true);
                  setPassword(generateRandomPassword(8));
                }}
              >
                Generate
              </button>
              {generated && (
                <button
                  type="button"
                  title="Copy generated password to clipboard"
                  aria-label="Copy generated password to clipboard"
                  onClick={copyPassword}
                  className="rounded-md border border-[#8b30e7] px-4 py-2.5 text-sm font-semibold text-[#8b30e7] hover:bg-[#f2e8ff]"
                >
                  {copied ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check size={16} strokeWidth={2} />
                      Copied
                    </span>
                  ) : (
                    "Copy"
                  )}
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-[#6b5798]">
              Optional. If left blank, password defaults to title in lowercase with no spaces.
            </p>
          </div>

          {error && <p className="text-base text-[#cf3a50]">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#d4c9f6] px-5 py-2.5 text-base font-semibold text-[#4a2b7a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className="rounded-md bg-gradient-to-r from-[#8325db] to-[#f35f9c] px-5 py-2.5 text-base font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create Config"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
