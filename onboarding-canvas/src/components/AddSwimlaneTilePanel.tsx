"use client";

import type { TileCategory } from "@/lib/types";
import { appendBulletNewline } from "@/lib/tile-text-bullets";
import { Check, X } from "lucide-react";
import { useCallback, useId, useState } from "react";
import clsx from "clsx";

const CATEGORY_OPTIONS: { value: Extract<TileCategory, "customer_activity" | "onboarding_session">; label: string }[] =
  [
    { value: "customer_activity", label: "Customer activity" },
    { value: "onboarding_session", label: "Onboarding session" },
  ];

type Props = {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  onSubmit: (payload: {
    title: string;
    description: string;
    attendees: string;
    resources: string;
    desiredOutcomes: string;
    category: Extract<TileCategory, "customer_activity" | "onboarding_session">;
  }) => Promise<boolean>;
};

function BulletTextarea({
  id,
  label,
  value,
  onChange,
  rows,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-[#2c1650]">{label}</span>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onChange(appendBulletNewline(value));
          }
        }}
        onFocus={(e) => {
          if (!e.target.value.trim()) onChange("• ");
        }}
        className="mt-1 w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-2.5 py-2 text-[12px] leading-snug text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7] disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="• "
      />
    </label>
  );
}

export function AddSwimlaneTilePanel({
  open,
  onClose,
  isSaving,
  onSubmit,
}: Props) {
  const baseId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attendees, setAttendees] = useState("");
  const [resources, setResources] = useState("");
  const [desiredOutcomes, setDesiredOutcomes] = useState("");
  const [category, setCategory] = useState<Extract<TileCategory, "customer_activity" | "onboarding_session">>(
    "customer_activity",
  );
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setAttendees("");
    setResources("");
    setDesiredOutcomes("");
    setCategory("customer_activity");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    reset();
    onClose();
  }, [isSaving, onClose, reset]);

  if (!open) return null;

  async function handleSave() {
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      return;
    }
    setError(null);
    const ok = await onSubmit({
      title: t,
      description: description.trim(),
      attendees: attendees.trim(),
      resources: resources.trim(),
      desiredOutcomes: desiredOutcomes.trim(),
      category,
    });
    if (ok) {
      reset();
      onClose();
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] cursor-default bg-black/40 backdrop-blur-[2px]"
        aria-label="Dismiss add tile panel"
        onClick={handleClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-md flex-col overflow-hidden border-l border-[#C9C4EF] bg-white shadow-2xl"
        aria-label="Add tile"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8E5F8] bg-white px-5 py-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B5A9A]">New tile</p>
            <h2 className="mt-1 text-[18px] font-semibold leading-snug text-[#1a102b]">Add Activity</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#801ED7] px-3 py-2 text-[12px] font-semibold text-white shadow-md hover:bg-[#6b18b8] disabled:opacity-60"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.5} aria-hidden />
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#2c1650]">Title</span>
            <input
              id={`${baseId}-title`}
              type="text"
              value={title}
              disabled={isSaving}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-[#d4c9f6] bg-white px-2.5 py-1 text-[12px] leading-snug text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]"
              placeholder="Activity name"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-[#2c1650]">Description</span>
            <textarea
              id={`${baseId}-desc`}
              value={description}
              disabled={isSaving}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-2.5 py-2 text-[12px] leading-snug text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]"
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-[#2c1650]">Category</span>
            <select
              id={`${baseId}-cat`}
              value={category}
              disabled={isSaving}
              onChange={(e) =>
                setCategory(e.target.value as Extract<TileCategory, "customer_activity" | "onboarding_session">)
              }
              className="mt-1 h-8 w-full rounded-lg border border-[#d4c9f6] bg-white px-2.5 py-1 text-[12px] leading-snug text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <BulletTextarea
            id={`${baseId}-att`}
            label="Attendees"
            value={attendees}
            onChange={setAttendees}
            rows={4}
            disabled={isSaving}
          />
          <BulletTextarea
            id={`${baseId}-res`}
            label="Resources"
            value={resources}
            onChange={setResources}
            rows={4}
            disabled={isSaving}
          />
          <BulletTextarea
            id={`${baseId}-out`}
            label="Desired outcomes"
            value={desiredOutcomes}
            onChange={setDesiredOutcomes}
            rows={4}
            disabled={isSaving}
          />

          {error ? <p className="text-[12px] font-medium text-[#91186E]">{error}</p> : null}
        </div>

        <footer className="shrink-0 border-t border-[#E8E5F8] bg-[#faf8ff] px-5 py-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold text-white shadow-md",
              isSaving ? "cursor-wait bg-[#6b18b8]" : "bg-[#801ED7] hover:bg-[#6b18b8]",
            )}
          >
            {isSaving ? (
              "Saving…"
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} aria-hidden />
                Save tile
              </>
            )}
          </button>
        </footer>
      </aside>
    </>
  );
}
