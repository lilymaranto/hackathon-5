import { normalizeBrandDomainInput } from "@/lib/normalize-brand-domain";
import type { BrandExtractColor, BrandExtractLogo } from "@/lib/brand-extract-types";
import { extractBrandAssets } from "openbrand";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function normalizeHex(hex: string): string | null {
  const t = hex.trim();
  if (!/^#[0-9a-f]{3,8}$/i.test(t)) return null;
  if (t.length === 4) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return t.toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const domainParam = request.nextUrl.searchParams.get("domain")?.trim() ?? "";
    const { hostname, url } = normalizeBrandDomainInput(domainParam);

    const extracted = await extractBrandAssets(url);
    if (!extracted.ok) {
      return NextResponse.json(
        { error: extracted.error.message ?? "Could not extract brand assets." },
        { status: 502 },
      );
    }

    const logos: BrandExtractLogo[] = [];
    const seenLogo = new Set<string>();
    for (const logo of extracted.data.logos ?? []) {
      const logoUrl = String(logo.url ?? "").trim();
      if (!logoUrl || seenLogo.has(logoUrl)) continue;
      if (logoUrl.startsWith("data:")) continue;
      seenLogo.add(logoUrl);
      logos.push({ url: logoUrl });
    }

    const colors: BrandExtractColor[] = [];
    const seenColor = new Set<string>();
    for (const color of extracted.data.colors ?? []) {
      const hex = normalizeHex(String(color.hex ?? ""));
      if (!hex || seenColor.has(hex)) continue;
      seenColor.add(hex);
      colors.push({ hex });
    }

    if (logos.length === 0 && colors.length === 0) {
      return NextResponse.json(
        { error: "No logos or brand colors found for this domain." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      data: {
        domain: hostname,
        logos,
        colors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Brand extraction failed." },
      { status: 400 },
    );
  }
}
