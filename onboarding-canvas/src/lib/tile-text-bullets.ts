import type { TileLibraryLink } from "@/lib/types";

/** Split sheet-style multiline text into display lines (strips leading bullet markers). */
export function parseBulletLines(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-\*·]+/, "").trim())
    .filter(Boolean);
}

function normalizeComparableLines(lines: string[]): string {
  return lines
    .map((l) => l.replace(/^[\s•\-\*·]+/, "").trim())
    .filter(Boolean)
    .join("\n");
}

/** True when edited bullet text matches the library default lines (sheet can stay empty). */
export function committedBulletTextMatchesLibrary(draft: string, libraryLines: string[]): boolean {
  return normalizeComparableLines(parseBulletLines(draft)) === normalizeComparableLines(libraryLines);
}

/** Seed a textarea from library lines using `• ` prefixes. */
export function linesToEditableBulletText(lines: string[]): string {
  if (!lines.length) return "";
  return lines
    .map((l) => l.replace(/^[\s•\-\*·]+/, "").trim())
    .filter(Boolean)
    .map((l) => `• ${l}`)
    .join("\n");
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const RESOURCE_LABEL_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function capitalizeResourceLabelWord(word: string, index: number): string {
  const lower = word.toLowerCase();
  if (lower === "ip") return "IP";
  if (lower === "ips") return "IPs";
  if (lower === "sms") return "SMS";
  if (lower === "api") return "API";
  if (lower === "sdk") return "SDK";
  if (lower === "dns") return "DNS";
  if (lower === "ssl") return "SSL";
  if (lower === "qa") return "QA";
  if (lower === "url" || lower === "urls") return lower.toUpperCase();
  if (lower === "id" || lower === "ids") return lower.toUpperCase();
  if (index > 0 && RESOURCE_LABEL_SMALL_WORDS.has(lower)) return lower;
  if (!lower) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Title-style label for doc URLs (e.g. `setting_up_ips_and_domains` → Setting Up IPs and Domains). */
export function capitalizeResourceLabel(slug: string): string {
  const normalized = slug.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return slug;
  return normalized
    .split(" ")
    .map((word, index) => capitalizeResourceLabelWord(word, index))
    .join(" ");
}

/** Human-readable label from a documentation URL (last path segment). */
export function resourceLabelFromUrl(url: string): string {
  const trimmed = url.trim();
  let slug = trimmed;
  try {
    const u = new URL(trimmed);
    const hash = u.hash.replace(/^#/, "").trim();
    if (hash) {
      slug = hash.split("/").filter(Boolean).pop() ?? hash;
    } else {
      const path = decodeURIComponent(u.pathname).replace(/\/$/, "");
      const parts = path.split("/").filter(Boolean);
      slug = parts[parts.length - 1] ?? u.hostname;
    }
  } catch {
    slug = trimmed;
  }
  return capitalizeResourceLabel(slug);
}

/** Extract unique HTTP(S) URLs from plan-task / sheet resources text. */
export function urlsFromResourcesSheetText(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const found = raw.match(URL_IN_TEXT_RE) ?? [];
  const urls = found.map((u) => u.replace(/[.,;]+$/, ""));
  return [...new Set(urls)];
}

export function resourceLinksFromSheetText(raw: string | undefined): TileLibraryLink[] {
  return urlsFromResourcesSheetText(raw).map((url) => ({
    label: resourceLabelFromUrl(url),
    url,
  }));
}

/** Plain multiline seed for editing resources when the sheet is empty (mirrors link list). */
export function libraryResourceLinksToEditableText(links: TileLibraryLink[]): string {
  return links
    .map((l) => {
      const label = l.label.trim();
      const url = (l.url || "").trim();
      if (!url || url === "#") return label;
      return `${label}: ${url}`;
    })
    .join("\n");
}

export function committedResourcesTextMatchesLibrary(draft: string, links: TileLibraryLink[]): boolean {
  return draft.trim() === libraryResourceLinksToEditableText(links).trim();
}

/** Prefer non-empty sheet lines; otherwise use library defaults. */
export function mergeLinesPreferSheet(sheetText: string | undefined, libraryLines: string[]): string[] {
  const fromSheet = parseBulletLines(sheetText);
  if (fromSheet.length) return fromSheet;
  return libraryLines;
}

/** When user presses Enter in a bullet field, continue with a bullet prefix. */
export function appendBulletNewline(current: string): string {
  if (!current.endsWith("\n")) return `${current}\n• `;
  return `${current}• `;
}
