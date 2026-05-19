import { readBrandColorHexFromDataTransfer } from "@/lib/brand-color-drag";
import type { DragEvent } from "react";

export function handleColorDrop(
  event: DragEvent,
  onHex: (hex: string) => void,
): void {
  event.preventDefault();
  event.stopPropagation();
  const hex = readBrandColorHexFromDataTransfer(event.dataTransfer);
  if (hex) onHex(hex);
}

export function handleColorDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
}
