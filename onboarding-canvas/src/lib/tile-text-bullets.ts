/** Split sheet-style multiline text into display lines (strips leading bullet markers). */
export function parseBulletLines(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-\*·]+/, "").trim())
    .filter(Boolean);
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
