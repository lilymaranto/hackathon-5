"use client";

import { BRAZE_CORE_PLAN_OPTIONS, labelForPlanOption } from "@/lib/constants";
import { PlanOptionId } from "@/lib/types";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: PlanOptionId;
  onChange: (id: PlanOptionId) => void;
  /** Matches surrounding form controls (`md` = create panel, `sm` = edit form). */
  size?: "md" | "sm";
  /** Tighter padding / icon (~10% smaller) for dense panels (e.g. create config drawer). */
  compact?: boolean;
  disabled?: boolean;
};

export function PlanTimelineSelect({ value, onChange, size = "md", compact = false, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerClasses =
    size === "sm"
      ? compact
        ? "px-[11px] py-[7px] text-xs font-normal"
        : "px-3 py-2 text-xs font-normal"
      : "px-4 py-2.5 text-sm";

  const optionRowClasses =
    size === "sm"
      ? compact
        ? "px-[11px] py-[7px] text-xs"
        : "px-3 py-2 text-xs"
      : "px-4 py-2.5 text-sm";

  const chevronSize = size === "sm" ? (compact ? 12 : 14) : 16;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-[#d4c9f6] bg-white text-left outline-none focus:border-[#8b30e7] disabled:cursor-not-allowed disabled:opacity-60",
          compact && size === "sm" && "rounded-md",
          triggerClasses,
        )}
      >
        <span className="min-w-0 truncate">{labelForPlanOption(value)}</span>
        <ChevronDown
          size={chevronSize}
          strokeWidth={2}
          className={clsx("shrink-0 text-[#5f478f] opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className={clsx(
            "absolute left-0 right-0 top-full z-[60] max-h-72 overflow-y-auto rounded-lg border border-[#d4c9f6] bg-white shadow-lg",
            compact ? "mt-[3px] py-[3px]" : "mt-1 py-1",
          )}
        >
          {BRAZE_CORE_PLAN_OPTIONS.map((opt) => (
            <li key={opt.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.id === value}
                className={clsx(
                  "w-full text-left hover:bg-[#f5efff]",
                  optionRowClasses,
                  opt.id === value && "bg-[#ede6ff] font-semibold text-[#4a2b7a]",
                )}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
