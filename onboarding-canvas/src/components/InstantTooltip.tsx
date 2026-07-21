"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type InstantTooltipProps = {
  label: string;
  children: ReactElement<{
    className?: string;
    "aria-label"?: string;
    "aria-describedby"?: string;
  }>;
};

export function InstantTooltip({ label, children }: InstantTooltipProps) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const show = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  if (!isValidElement(children)) {
    return children as ReactNode;
  }

  const child = cloneElement(children, {
    "aria-label": children.props["aria-label"] ?? label,
    "aria-describedby": open ? tooltipId : undefined,
  });

  return (
    <>
      <span
        ref={anchorRef}
        className="relative inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {child}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className="pointer-events-none fixed z-[100] max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-md bg-[#28134d] px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-white shadow-lg"
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
