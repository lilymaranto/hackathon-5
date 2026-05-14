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
