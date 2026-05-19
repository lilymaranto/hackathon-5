"use client";

import { setBrandColorDragData } from "@/lib/brand-color-drag";
import { disableDragAutoScroll, enableDragAutoScroll } from "@/lib/drag-auto-scroll";
import clsx from "clsx";
import { useCallback, useState } from "react";

type Props = {
  hex: string;
  disabled?: boolean;
};

export function BrandColorSwatch({ hex, disabled = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const copyHex = useCallback(async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      /* ignore */
    }
  }, [disabled, hex]);

  return (
    <button
      type="button"
      disabled={disabled}
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) return;
        setBrandColorDragData(e.dataTransfer, hex);
        enableDragAutoScroll();
      }}
      onDragEnd={() => {
        disableDragAutoScroll();
      }}
      onClick={() => void copyHex()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        "flex w-[4.5rem] flex-col items-center gap-1 rounded-md border bg-white p-1.5 text-center transition",
        hovered && !disabled ? "border-[#8b30e7] shadow-sm" : "border-[#e8dff9]",
        disabled && "opacity-50",
      )}
    >
      <span
        className="h-8 w-full rounded border border-[#e8dff9]"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <span className="font-mono text-[9px] text-[#2c1650]">{hex}</span>
      {copied ? (
        <span className="text-[9px] font-semibold text-[#801ED7]">Copied</span>
      ) : (
        <span className="text-[9px] text-transparent" aria-hidden>
          —
        </span>
      )}
    </button>
  );
}
