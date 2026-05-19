"use client";

import { BrandColorSwatch } from "@/components/brand/BrandColorSwatch";
import { useBrandExtract } from "@/components/brand/brand-extract-context";
import { BRAND_LOGO_DRAG_MIME } from "@/lib/brand-extract-types";
import clsx from "clsx";
import { useState } from "react";

type Props = {
  disabled?: boolean;
};

export function BrandExtractResults({ disabled = false }: Props) {
  const { results, applyLogoUrl } = useBrandExtract();
  const [hoveredLogoUrl, setHoveredLogoUrl] = useState<string | null>(null);

  if (!results) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div>
        <p className="text-xs font-semibold text-[#2c1650]">Results</p>
        <p className="mt-0.5 text-[10px] leading-snug text-[#6b5798]">
          Click to copy or drag to desired box below.
        </p>
      </div>

      {results.logos.length > 0 ? (
        <div>
          <p className="mb-0.5 text-[10px] font-medium text-[#9b8fb8]">Logos</p>
          <div className="flex flex-wrap gap-2">
            {results.logos.map((logo) => (
              <div
                key={logo.url}
                role="button"
                tabIndex={disabled ? -1 : 0}
                draggable={!disabled}
                onDragStart={(e) => {
                  if (disabled) return;
                  e.dataTransfer.setData(BRAND_LOGO_DRAG_MIME, logo.url);
                  e.dataTransfer.setData("text/uri-list", logo.url);
                  e.dataTransfer.setData("text/plain", logo.url);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  if (!disabled) applyLogoUrl(logo.url);
                }}
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    applyLogoUrl(logo.url);
                  }
                }}
                onMouseEnter={() => setHoveredLogoUrl(logo.url)}
                onMouseLeave={() => setHoveredLogoUrl(null)}
                className={clsx(
                  "relative flex h-[72px] w-[120px] items-center justify-center rounded-md border border-[#e8dff9] bg-white p-2",
                  !disabled && "cursor-grab active:cursor-grabbing",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <img
                  src={logo.url}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
                {hoveredLogoUrl === logo.url && !disabled ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-[#300266]/75 px-2 text-center text-[10px] font-semibold text-white">
                    Use this logo
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {results.colors.length > 0 ? (
        <div>
          <p className="mb-0.5 text-[10px] font-medium text-[#9b8fb8]">Colors</p>
          <div className="flex flex-wrap gap-2">
            {results.colors.map((color) => (
              <BrandColorSwatch key={color.hex} hex={color.hex} disabled={disabled} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
