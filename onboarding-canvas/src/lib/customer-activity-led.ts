import type { ConfigRecord, CustomerActivityLed, TileCategory } from "@/lib/types";

export type { CustomerActivityLed };

export function parseCustomerActivityLed(value: unknown): CustomerActivityLed {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "partner" || s === "partner-led" || s === "partner_led") return "partner";
  return "customer";
}

/** Category pill in tile drawer header (prospect / partner naming). */
export function drawerCategoryBadgeLabel(
  category: TileCategory,
  config: Pick<ConfigRecord, "Title" | "partnerName" | "handsOnKeyboardSupport">,
  activityLed?: CustomerActivityLed,
): string {
  if (category === "milestone") return "Milestone";
  const prospect = config.Title.trim() || "Customer";
  const partner = config.partnerName?.trim() || "Partner";
  if (category === "onboarding_session") return `${prospect} Onboarding Session`;
  if (
    category === "customer_activity" &&
    config.handsOnKeyboardSupport &&
    parseCustomerActivityLed(activityLed) === "partner"
  ) {
    return `${partner} Activity`;
  }
  if (category === "customer_activity") return `${prospect} Activity`;
  return "Activity";
}

export function customerActivityLedLabels(config: Pick<ConfigRecord, "Title" | "partnerName">): {
  customer: string;
  partner: string;
} {
  const customerName = config.Title.trim() || "Customer";
  const partnerName = config.partnerName?.trim() || "Partner";
  return {
    customer: `${customerName}-Led`,
    partner: `${partnerName}-Led`,
  };
}
