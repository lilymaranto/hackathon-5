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
  disabled?: boolean;
};

export function PlanTimelineSelect({ value, onChange, size = "md", disabled }: Props) {
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
      ? "px-3 py-2 text-sm font-normal"
      : "px-4 py-2.5 text-base";

  const optionRowClasses = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-base";

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
          triggerClasses,
        )}
      >
        <span className="min-w-0 truncate">{labelForPlanOption(value)}</span>
        <ChevronDown
          size={size === "sm" ? 16 : 18}
          strokeWidth={2}
          className={clsx("shrink-0 text-[#5f478f] opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#d4c9f6] bg-white py-1 shadow-lg"
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
