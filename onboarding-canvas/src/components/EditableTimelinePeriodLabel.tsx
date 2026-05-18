"use client";

import {
  formatTimelineDateLabel,
  hasTimelineStartDate,
  isValidIsoDate,
} from "@/lib/timeline-dates";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

type Props = {
  index: number;
  fallbackLabel: string;
  isoDate?: string;
  /** All period dates for this config (used to gate non-start edits until start is set). */
  timelineDates?: string[];
  editable: boolean;
  onCommit: (index: number, isoDate: string) => void;
  className?: string;
};

export function EditableTimelinePeriodLabel({
  index,
  fallbackLabel,
  isoDate,
  timelineDates,
  editable,
  onCommit,
  className,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(isoDate ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const isStartPeriod = index === 0;
  const timelineHasStart = hasTimelineStartDate(timelineDates);
  const canActivate = editable && (isStartPeriod || timelineHasStart);

  const display =
    isoDate && isValidIsoDate(isoDate) ? formatTimelineDateLabel(isoDate) : fallbackLabel;

  useEffect(() => {
    if (!editing) setDraft(isoDate ?? "");
  }, [isoDate, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const next = draft.trim();
    if (!next) return;
    if (!isValidIsoDate(next)) return;
    if (next === (isoDate ?? "").trim()) return;
    onCommit(index, next);
  }, [draft, index, isoDate, onCommit]);

  const startEdit = useCallback(
    (e: MouseEvent) => {
      if (!canActivate) return;
      e.stopPropagation();
      setDraft(isoDate ?? "");
      setEditing(true);
    },
    [canActivate, isoDate],
  );

  if (!editable) {
    return <span className={className}>{display}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(isoDate ?? "");
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-[9.5rem] rounded border border-[#8b30e7] bg-white px-1 py-0.5 text-center text-[10px] font-semibold text-[#300266] outline-none sm:text-[11px]"
      />
    );
  }

  const title = !canActivate
    ? "Set the start date on the first period first"
    : isStartPeriod && !timelineHasStart
      ? "Click to set start date (other periods will be calculated)"
      : isStartPeriod
        ? "Click to change start date (recalculates following periods)"
        : "Click to edit this date";

  return (
    <span
      className={clsx(
        className,
        canActivate && "cursor-pointer rounded-sm hover:bg-[#f6efff]/80",
      )}
      title={title}
      onClick={startEdit}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {display}
    </span>
  );
}
