"use client";

import {
  adsChevronDisplayTitle,
  AI_DECISIONING_STUDIO_TEAM_ROWS,
  getTileLibraryEntry,
} from "@/lib/constants";
import {
  committedBulletTextMatchesLibrary,
  committedResourcesTextMatchesLibrary,
  libraryResourceLinksToEditableText,
  linesToEditableBulletText,
  mergeLinesPreferSheet,
  parseBulletLines,
} from "@/lib/tile-text-bullets";
import {
  DEFAULT_TOOLBAR_BUTTON_HEX,
  parseHexColorOptional,
  toolbarPrimaryHoverHex,
} from "@/lib/tile-category-colors";
import {
  BRAZE_RESOURCES_CHART_SECTION_ID,
  brazeResourceRowDomIdForAttendeeLine,
} from "@/lib/braze-core-resources-data";
import {
  customerActivityLedLabels,
  drawerCategoryBadgeLabel,
  parseCustomerActivityLed,
} from "@/lib/customer-activity-led";
import {
  ConfigRecord,
  CustomerActivityLed,
  TileLibraryEntry,
  TileLibraryLink,
  TileRecord,
  type PlanOptionId,
} from "@/lib/types";
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  ListChecks,
  NotepadText,
  PartyPopper,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type BrazeAttendeeJumpConfig = {
  planOptionId: PlanOptionId;
  emailEnabled: boolean;
  onNavigateToRow: (rowElementId: string) => void;
};

type Props = {
  tile: TileRecord | null;
  config: ConfigRecord;
  onClose: () => void;
  /** AI Decisioning Studio: scroll main page to Customer Roles chart (closes drawer). */
  onNavigateToCustomerRolesChart?: () => void;
  /** Braze Core: suggested-attendee bullets jump to a matched chart row, or to the chart section when unmatched. */
  brazeAttendeeJump?: BrazeAttendeeJumpConfig;
  /** Braze Core + AI Decisioning Studio: in-memory notes text (may differ from sheet until Save / Save layout). */
  notesValue: string;
  /** Commit notes draft (double-click edit); updates parent pending state. */
  onNotesCommit: (value: string) => void;
  /** Persist notes / title / description / … for this tile to Caboodle now (PATCH). Returns whether the request succeeded. */
  onNotesOkay: () => boolean | Promise<boolean>;
  notesOkayPending?: boolean;
  readOnly?: boolean;
  /** Guest password view: title & description are read-only; keep `readOnly={false}` so notes + Save stay available. */
  guestMode?: boolean;
  /** Stable id for the open tile — resets the post-save checkmark when switching tiles. */
  notesEditorKey: string;
  /** When false, drawer Save is disabled (nothing unsaved for this tile). */
  drawerContentDirty?: boolean;
  /** In-memory title edits (double-click header); merged in parent until Save. */
  onDrawerTitleCommit: (title: string) => void;
  /** In-memory description edits (double-click description); merged in parent until Save. */
  onDrawerDescriptionCommit: (description: string) => void;
  onDrawerAgendaCommit: (value: string) => void;
  onDrawerAttendeesCommit: (value: string) => void;
  onDrawerResourcesCommit: (value: string) => void;
  onDrawerDesiredOutcomesCommit: (value: string) => void;
  onDrawerLevelOfEffortCommit: (value: string) => void;
  onDrawerActivityLedCommit: (value: CustomerActivityLed) => void;
  /** Braze Core: all tiles; AI Decisioning: custom tiles only. Opens confirmation in parent. */
  showDeleteTile?: boolean;
  onDeleteTilePress?: () => void;
  deleteTilePending?: boolean;
};

function ResourceLine({ item }: { item: TileLibraryLink }) {
  const isPlaceholder = !item.url || item.url === "#";
  if (isPlaceholder) {
    return <span className="text-[#2F2354]">{item.label}</span>;
  }
  return (
    <a className="text-[#801ED7] underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">
      {item.label}
    </a>
  );
}

function IconSection({
  icon: Icon,
  title,
  titleClassName,
  children,
  titleOnDoubleClick,
  titleDoubleClickHint,
}: {
  icon: LucideIcon;
  title: string;
  /** Defaults to `text-base`; use `text-[17px]` for AI Decisioning Studio (+2px). */
  titleClassName?: string;
  children: ReactNode;
  /** When set, double-clicking the heading starts the same edit as the body (see description UX). */
  titleOnDoubleClick?: () => void;
  /** Shown as the native tooltip when `titleOnDoubleClick` is set. */
  titleDoubleClickHint?: string;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[#801ED7]" aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={clsx(
              "font-semibold text-[#2c1650]",
              titleClassName ?? "text-base",
              titleOnDoubleClick && "w-fit cursor-text rounded-sm outline-offset-2 hover:bg-[#f6efff]/70",
            )}
            onDoubleClick={titleOnDoubleClick}
            title={titleOnDoubleClick ? titleDoubleClickHint : undefined}
          >
            {title}
          </h3>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BulletList({ items, itemClassName }: { items: string[]; itemClassName?: string }) {
  return (
    <ul className="space-y-2 pl-1 text-[#2F2354]">
      {items.map((line) => (
        <li key={line} className={clsx("flex gap-2 leading-relaxed", itemClassName ?? "text-sm")}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function BulletListWithBrazeAttendeeJumps({
  items,
  itemClassName,
  brazeAttendeeJump,
}: {
  items: string[];
  itemClassName?: string;
  brazeAttendeeJump: BrazeAttendeeJumpConfig;
}) {
  if (!items.length) return <EmptyBulletPlaceholder className={itemClassName} />;
  const { planOptionId, emailEnabled, onNavigateToRow } = brazeAttendeeJump;
  return (
    <ul className="space-y-2 pl-1 text-[#2F2354]">
      {items.map((line, index) => {
        const rowDomId = brazeResourceRowDomIdForAttendeeLine(line, planOptionId, emailEnabled);
        const scrollTargetId = rowDomId ?? BRAZE_RESOURCES_CHART_SECTION_ID;
        const label = line.trim() || "name";
        const matchedRole = Boolean(rowDomId);
        return (
          <li
            key={`${index}:${line}`}
            className={clsx("flex gap-2 leading-relaxed", itemClassName ?? "text-sm")}
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]" aria-hidden />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToRow(scrollTargetId);
                }}
                className="text-left font-normal text-[#300266] no-underline hover:underline"
                title={
                  matchedRole
                    ? "View this role on the resources chart"
                    : "Open the roles & responsibilities chart"
                }
                aria-label={
                  matchedRole
                    ? `View ${label} on the resources chart`
                    : `Open resources chart (${label})`
                }
              >
                {line}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const NOTES_SAVED_CHECK_MS = 1200;

function DoubleClickTitleBlock({
  displayTitle,
  editTitle,
  onCommit,
  readOnly,
  headingClassName,
  editorKey,
}: {
  displayTitle: string;
  editTitle: string;
  onCommit: (value: string) => void;
  readOnly?: boolean;
  headingClassName: string;
  editorKey: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editTitle);

  useEffect(() => {
    setEditing(false);
  }, [editorKey]);

  useEffect(() => {
    if (!editing) setDraft(editTitle);
  }, [editTitle, editing]);

  if (readOnly) {
    return <h2 className={headingClassName}>{displayTitle}</h2>;
  }

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        aria-label="Edit tile title"
        className={clsx(
          headingClassName,
          "w-full rounded-md border border-[#d4c9f6] bg-white px-2 py-1 text-[#1a102b] shadow-inner outline-none focus:border-[#8b30e7]",
        )}
        onBlur={() => {
          onCommit(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(editTitle);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <h2
      className={clsx(
        headingClassName,
        "cursor-text rounded-sm outline-offset-2 hover:bg-[#f6efff]/70",
      )}
      onDoubleClick={() => {
        setDraft(editTitle);
        setEditing(true);
      }}
      title="Double-click to edit title"
    >
      {displayTitle}
    </h2>
  );
}

function EditableDescriptionSection({
  libraryDescription,
  sheetDescription,
  readOnly,
  aiDecisioningTypography,
  onCommit,
  editorKey,
}: {
  libraryDescription: string;
  sheetDescription: string;
  readOnly?: boolean;
  aiDecisioningTypography?: boolean;
  onCommit: (value: string) => void;
  editorKey: string;
}) {
  const libraryTrim = libraryDescription.trim();
  const sheetTrim = sheetDescription.trim();
  const displayText = sheetTrim || libraryTrim;
  const editSeed = sheetTrim || libraryTrim;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editSeed);

  useEffect(() => {
    setEditing(false);
  }, [editorKey]);

  useEffect(() => {
    if (!editing) setDraft(editSeed);
  }, [editSeed, editing]);

  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";

  const startEdit = () => {
    if (readOnly) return;
    setDraft(editSeed);
    setEditing(true);
  };

  if (readOnly) {
    return (
      <section>
        <h3 className={clsx("font-semibold text-[#2c1650]", sectionTitle)}>Description</h3>
        {displayText ? (
          <p className={clsx("mt-3 leading-relaxed", bodyText)}>{displayText}</p>
        ) : (
          <div className="mt-3">
            <EmptyBulletPlaceholder className={bodyText} />
          </div>
        )}
      </section>
    );
  }

  if (editing) {
    return (
      <section>
        <h3 className={clsx("font-semibold text-[#2c1650]", sectionTitle)}>Description</h3>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          rows={6}
          aria-label="Edit tile description"
          className={clsx(
            "mt-3 w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]",
            bodyText,
            "min-h-[6rem]",
          )}
          onBlur={() => {
            onCommit(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(editSeed);
              setEditing(false);
            }
          }}
        />
      </section>
    );
  }

  return (
    <section>
      <h3
        className={clsx(
          "font-semibold text-[#2c1650]",
          sectionTitle,
          "w-fit cursor-text rounded-sm outline-offset-2 hover:bg-[#f6efff]/70",
        )}
        onDoubleClick={startEdit}
        title="Double-click to edit description"
      >
        Description
      </h3>
      {displayText ? (
        <p
          className={clsx(
            "mt-3 cursor-text rounded-sm leading-relaxed outline-offset-2 hover:bg-[#f6efff]/70",
            bodyText,
          )}
          onDoubleClick={startEdit}
          title="Double-click to edit description"
        >
          {displayText}
        </p>
      ) : (
        <div className="mt-3 cursor-text rounded-sm hover:bg-[#f6efff]/70" onDoubleClick={startEdit}>
          <EmptyBulletPlaceholder className={bodyText} />
        </div>
      )}
    </section>
  );
}

function EditableLevelOfEffortSection({
  sheetText,
  readOnly,
  aiDecisioningTypography,
  onCommit,
  editorKey,
}: {
  sheetText: string;
  readOnly?: boolean;
  aiDecisioningTypography?: boolean;
  onCommit: (value: string) => void;
  editorKey: string;
}) {
  const displayText = sheetText.trim();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayText);

  useEffect(() => {
    setEditing(false);
  }, [editorKey]);

  useEffect(() => {
    if (!editing) setDraft(displayText);
  }, [displayText, editing]);

  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";

  const startEdit = () => {
    if (readOnly) return;
    setDraft(displayText);
    setEditing(true);
  };

  const body = editing ? (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      autoFocus
      rows={3}
      aria-label="Edit level of effort"
      placeholder="e.g. 2 hours, half day…"
      className={clsx(
        "w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]",
        bodyText,
        "min-h-[4rem] placeholder:text-[#b8aed4]",
      )}
      onBlur={() => {
        onCommit(draft);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setDraft(displayText);
          setEditing(false);
        }
      }}
    />
  ) : displayText ? (
    <p
      className={clsx(
        "cursor-text rounded-sm leading-relaxed outline-offset-2 hover:bg-[#f6efff]/70",
        bodyText,
      )}
      onDoubleClick={startEdit}
      title="Double-click to edit level of effort"
    >
      {displayText}
    </p>
  ) : (
    <div className="cursor-text rounded-sm hover:bg-[#f6efff]/70" onDoubleClick={startEdit}>
      <EmptyBulletPlaceholder className={bodyText} />
    </div>
  );

  return (
    <IconSection
      icon={Clock}
      title="Level of Effort"
      titleClassName={sectionTitle}
      titleOnDoubleClick={readOnly ? undefined : startEdit}
      titleDoubleClickHint={readOnly ? undefined : "Double-click to edit level of effort"}
    >
      {readOnly ? (
        displayText ? (
          <p className={clsx("leading-relaxed", bodyText)}>{displayText}</p>
        ) : (
          <EmptyBulletPlaceholder className={bodyText} />
        )
      ) : (
        body
      )}
    </IconSection>
  );
}

function EditableBulletListSection({
  icon: Icon,
  title,
  libraryLines,
  sheetText,
  onCommit,
  readOnly,
  editorKey,
  aiDecisioningTypography,
  brazeAttendeeJump,
}: {
  icon: LucideIcon;
  title: string;
  libraryLines: string[];
  sheetText: string | undefined;
  onCommit: (value: string) => void;
  readOnly?: boolean;
  editorKey: string;
  aiDecisioningTypography?: boolean;
  brazeAttendeeJump?: BrazeAttendeeJumpConfig;
}) {
  const merged = mergeLinesPreferSheet(sheetText, libraryLines);
  const rawSheet = String(sheetText ?? "").trimEnd();
  const editSeed = useMemo(
    () =>
      parseBulletLines(sheetText).length > 0 ? rawSheet : linesToEditableBulletText(libraryLines),
    [sheetText, libraryLines, rawSheet],
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editSeed);

  useEffect(() => {
    setEditing(false);
  }, [editorKey]);

  useEffect(() => {
    if (!editing) setDraft(editSeed);
  }, [editSeed, editing]);

  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";

  const startEdit = () => {
    if (readOnly) return;
    setDraft(editSeed);
    setEditing(true);
  };

  const flushCommit = (value: string) => {
    const canonical = committedBulletTextMatchesLibrary(value, libraryLines) ? "" : value;
    onCommit(canonical);
  };

  const listBody =
    brazeAttendeeJump ? (
      <BulletListWithBrazeAttendeeJumps
        items={merged}
        itemClassName={bodyText}
        brazeAttendeeJump={brazeAttendeeJump}
      />
    ) : (
      <TextSectionBody items={merged} itemClassName={bodyText} />
    );

  if (readOnly) {
    return (
      <IconSection icon={Icon} title={title} titleClassName={sectionTitle}>
        {listBody}
      </IconSection>
    );
  }

  if (editing) {
    return (
      <IconSection icon={Icon} title={title} titleClassName={sectionTitle}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          rows={6}
          aria-label={`Edit ${title}`}
          className={clsx(
            "mt-3 w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]",
            bodyText,
            "min-h-[6rem]",
          )}
          onBlur={() => {
            flushCommit(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(editSeed);
              setEditing(false);
            }
          }}
        />
      </IconSection>
    );
  }

  return (
    <IconSection
      icon={Icon}
      title={title}
      titleClassName={sectionTitle}
      titleOnDoubleClick={startEdit}
      titleDoubleClickHint={`Double-click to edit ${title.toLowerCase()}`}
    >
      <div
        className="cursor-text rounded-sm outline-offset-2 hover:bg-[#f6efff]/70"
        onDoubleClick={startEdit}
        title={`Double-click to edit ${title.toLowerCase()}`}
      >
        {listBody}
      </div>
    </IconSection>
  );
}

function EditableResourcesSection({
  tileResources,
  library,
  onCommit,
  readOnly,
  editorKey,
  aiDecisioningTypography,
}: {
  tileResources: string | undefined;
  library: TileLibraryEntry;
  onCommit: (value: string) => void;
  readOnly?: boolean;
  editorKey: string;
  aiDecisioningTypography?: boolean;
}) {
  const resourceLinesFromSheet = parseBulletLines(tileResources);
  const editSeed = useMemo(
    () =>
      resourceLinesFromSheet.length > 0
        ? String(tileResources ?? "").trimEnd()
        : libraryResourceLinksToEditableText(library.resources),
    [tileResources, library],
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(editSeed);

  useEffect(() => {
    setEditing(false);
  }, [editorKey]);

  useEffect(() => {
    if (!editing) setDraft(editSeed);
  }, [editSeed, editing]);

  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";

  const startEdit = () => {
    if (readOnly) return;
    setDraft(editSeed);
    setEditing(true);
  };

  const flushCommit = (value: string) => {
    const canonical = committedResourcesTextMatchesLibrary(value, library.resources) ? "" : value;
    onCommit(canonical);
  };

  if (readOnly) {
    return (
      <IconSection icon={BookOpen} title="Resources" titleClassName={sectionTitle}>
        {resourceLinesFromSheet.length > 0 ? (
          <TextSectionBody items={resourceLinesFromSheet} itemClassName={bodyText} />
        ) : (
          <LinksSectionBody items={library.resources} itemClassName={bodyText} />
        )}
      </IconSection>
    );
  }

  if (editing) {
    return (
      <IconSection icon={BookOpen} title="Resources" titleClassName={sectionTitle}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          rows={6}
          aria-label="Edit resources"
          className={clsx(
            "mt-3 w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]",
            bodyText,
            "min-h-[6rem]",
          )}
          onBlur={() => {
            flushCommit(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(editSeed);
              setEditing(false);
            }
          }}
        />
      </IconSection>
    );
  }

  return (
    <IconSection
      icon={BookOpen}
      title="Resources"
      titleClassName={sectionTitle}
      titleOnDoubleClick={startEdit}
      titleDoubleClickHint="Double-click to edit resources"
    >
      <div
        className="cursor-text rounded-sm outline-offset-2 hover:bg-[#f6efff]/70"
        onDoubleClick={startEdit}
        title="Double-click to edit resources"
      >
        {resourceLinesFromSheet.length > 0 ? (
          <TextSectionBody items={resourceLinesFromSheet} itemClassName={bodyText} />
        ) : (
          <LinksSectionBody items={library.resources} itemClassName={bodyText} />
        )}
      </div>
    </IconSection>
  );
}

function TileNotesSection({
  notesValue,
  onNotesCommit,
  onNotesOkay,
  notesOkayPending,
  readOnly,
  aiDecisioningTypography,
  notesEditorKey,
  drawerContentDirty,
  showDeleteTile,
  onDeleteTilePress,
  deleteTilePending,
  showActivityLedToggle,
  activityLed,
  activityLedCustomerLabel,
  activityLedPartnerLabel,
  onActivityLedChange,
  activityLedReadOnly,
}: {
  notesValue: string;
  onNotesCommit: (value: string) => void;
  onNotesOkay: () => boolean | Promise<boolean>;
  notesOkayPending?: boolean;
  readOnly?: boolean;
  aiDecisioningTypography?: boolean;
  notesEditorKey: string;
  drawerContentDirty?: boolean;
  showDeleteTile?: boolean;
  onDeleteTilePress?: () => void;
  deleteTilePending?: boolean;
  showActivityLedToggle?: boolean;
  activityLed?: CustomerActivityLed;
  activityLedCustomerLabel?: string;
  activityLedPartnerLabel?: string;
  onActivityLedChange?: (value: CustomerActivityLed) => void;
  activityLedReadOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notesValue);

  useEffect(() => {
    setEditing(false);
  }, [notesEditorKey]);

  useEffect(() => {
    if (!editing) setDraft(notesValue);
  }, [notesValue, editing]);

  const [showSavedCheck, setShowSavedCheck] = useState(false);
  const checkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setShowSavedCheck(false);
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [notesEditorKey]);

  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";
  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const placeholder = "Start typing notes here…";

  const startEdit = () => {
    if (readOnly) return;
    setDraft(notesValue);
    setEditing(true);
  };

  async function handleNotesSave() {
    if (drawerContentDirty === false) return;
    const ok = await Promise.resolve(onNotesOkay());
    if (!ok) return;
    setShowSavedCheck(true);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = window.setTimeout(() => {
      setShowSavedCheck(false);
      checkTimeoutRef.current = null;
    }, NOTES_SAVED_CHECK_MS);
  }

  return (
    <IconSection icon={NotepadText} title="Notes" titleClassName={sectionTitle}>
      <div className="relative">
        {readOnly ? (
          <textarea
            value={notesValue}
            readOnly
            disabled
            rows={4}
            placeholder={placeholder}
            aria-label="Tile notes"
            className={clsx(
              "w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none",
              bodyText,
              "min-h-[5.5rem] placeholder:text-[#b8aed4]",
              "cursor-not-allowed bg-[#f8f6fd] text-[#6B5A9A]",
            )}
          />
        ) : editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={4}
            placeholder={placeholder}
            aria-label="Tile notes"
            className={clsx(
              "w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]",
              bodyText,
              "min-h-[5.5rem] placeholder:text-[#b8aed4]",
            )}
            onBlur={() => {
              onNotesCommit(draft);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(notesValue);
                setEditing(false);
              }
            }}
          />
        ) : (
          <div
            className={clsx(
              "min-h-[5.5rem] cursor-text rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 shadow-inner hover:bg-[#f6efff]/50",
              bodyText,
            )}
            onDoubleClick={startEdit}
            title="Double-click to edit notes"
          >
            {notesValue.trim() ? (
              <p className="whitespace-pre-wrap leading-relaxed text-[#2F2354]">{notesValue}</p>
            ) : (
              <p className="text-[#b8aed4]">{placeholder}</p>
            )}
          </div>
        )}
        {!readOnly ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {showActivityLedToggle &&
            activityLed &&
            activityLedCustomerLabel &&
            activityLedPartnerLabel &&
            onActivityLedChange ? (
              <CustomerActivityLedToggle
                compact
                value={activityLed}
                customerLabel={activityLedCustomerLabel}
                partnerLabel={activityLedPartnerLabel}
                readOnly={activityLedReadOnly}
                onChange={onActivityLedChange}
              />
            ) : (
              <span className="min-w-0 shrink" aria-hidden />
            )}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {showDeleteTile && onDeleteTilePress ? (
              <button
                type="button"
                onClick={() => onDeleteTilePress()}
                disabled={deleteTilePending || notesOkayPending}
                className="flex min-h-[2.25rem] items-center justify-center gap-1.5 rounded-md border border-[#cf3a50] bg-white px-4 py-2 text-sm font-semibold text-[#cf3a50] shadow-sm transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden />
                {deleteTilePending ? "Deleting…" : "Delete"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleNotesSave()}
              disabled={
                notesOkayPending ||
                showSavedCheck ||
                (drawerContentDirty === false)
              }
              aria-label={showSavedCheck ? "Saved" : notesOkayPending ? "Saving" : "Save changes"}
              className={clsx(
                "flex min-h-[2.25rem] min-w-[5.25rem] items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60",
                showSavedCheck
                  ? "bg-emerald-600 hover:bg-emerald-600"
                  : "bg-[var(--tile-drawer-primary)] hover:bg-[var(--tile-drawer-primary-hover)]",
              )}
            >
              {notesOkayPending ? (
                "Saving…"
              ) : showSavedCheck ? (
                <Check size={20} strokeWidth={2.5} className="text-white" aria-hidden />
              ) : (
                "Save"
              )}
            </button>
            </div>
          </div>
        ) : null}
      </div>
    </IconSection>
  );
}

function LinkList({ items, itemClassName }: { items: TileLibraryLink[]; itemClassName?: string }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item) => (
        <li
          key={`${item.label}-${item.url}`}
          className={clsx("flex gap-2 leading-relaxed", itemClassName ?? "text-sm")}
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]" aria-hidden />
          <ResourceLine item={item} />
        </li>
      ))}
    </ul>
  );
}

function EmptyBulletPlaceholder({ className }: { className?: string }) {
  return <p className={clsx("text-[#9a8fb8]", className ?? "text-sm")}>—</p>;
}

/** Role list for AI Decisioning Studio tiles (`ads_*`) — same bullet pattern as Braze Core; roles jump to on-page chart. */
function AdsDecisioningStudioAttendees({
  onNavigateToCustomerRolesChart,
}: {
  onNavigateToCustomerRolesChart?: () => void;
}) {
  const jump = onNavigateToCustomerRolesChart;
  return (
    <ul className="space-y-2 pl-1 text-[#2F2354]">
      {AI_DECISIONING_STUDIO_TEAM_ROWS.map((row) => (
        <li key={row.role} className="flex gap-2 text-[15px] leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]" aria-hidden />
          <div className="min-w-0">
            {jump ? (
              <button
                type="button"
                onClick={jump}
                className="font-normal text-[#300266] no-underline hover:underline"
              >
                {row.role}
              </button>
            ) : (
              <span className="font-normal text-[#300266]">{row.role}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function TextSectionBody({
  items,
  itemClassName,
}: {
  items: string[];
  itemClassName?: string;
}) {
  if (!items.length) return <EmptyBulletPlaceholder className={itemClassName} />;
  return <BulletList items={items} itemClassName={itemClassName} />;
}

function LinksSectionBody({
  items,
  itemClassName,
}: {
  items: TileLibraryLink[];
  itemClassName?: string;
}) {
  if (!items.length) return <EmptyBulletPlaceholder className={itemClassName} />;
  return <LinkList items={items} itemClassName={itemClassName} />;
}

function MilestoneDrawerBody({
  tile,
  library,
  showAdsDecisioningAttendees,
  onNavigateToCustomerRolesChart,
  brazeAttendeeJump,
  aiDecisioningTypography,
  readOnly,
  onDescriptionCommit,
  onAttendeesCommit,
  editorKey,
}: {
  tile: TileRecord;
  library: TileLibraryEntry;
  showAdsDecisioningAttendees: boolean;
  onNavigateToCustomerRolesChart?: () => void;
  brazeAttendeeJump?: BrazeAttendeeJumpConfig;
  /** Larger copy (+2px) for AI Decisioning Studio configs. */
  aiDecisioningTypography?: boolean;
  readOnly?: boolean;
  onDescriptionCommit: (value: string) => void;
  onAttendeesCommit: (value: string) => void;
  editorKey: string;
}) {
  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";

  return (
    <div className="mt-8 text-[#2F2354]">
      <EditableDescriptionSection
        libraryDescription={library.description}
        sheetDescription={tile.Description ?? ""}
        readOnly={readOnly}
        aiDecisioningTypography={aiDecisioningTypography}
        onCommit={onDescriptionCommit}
        editorKey={editorKey}
      />

      {showAdsDecisioningAttendees ? (
        <IconSection icon={Users} title="Open roles chart" titleClassName={sectionTitle}>
          <AdsDecisioningStudioAttendees
            onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
          />
        </IconSection>
      ) : null}

      <EditableBulletListSection
        icon={Users}
        title="Suggested Attendees"
        libraryLines={library.suggested_attendees}
        sheetText={tile.Attendees}
        onCommit={onAttendeesCommit}
        readOnly={readOnly}
        editorKey={editorKey}
        aiDecisioningTypography={aiDecisioningTypography}
        brazeAttendeeJump={brazeAttendeeJump}
      />

      <IconSection icon={ListChecks} title="Success Checklist" titleClassName={sectionTitle}>
        <TextSectionBody items={library.success_checklist} itemClassName={bodyText} />
      </IconSection>

      <IconSection icon={PartyPopper} title="Strategic Impact" titleClassName={sectionTitle}>
        <TextSectionBody items={library.strategic_impact} itemClassName={bodyText} />
      </IconSection>
    </div>
  );
}

function CustomerActivityLedToggle({
  value,
  customerLabel,
  partnerLabel,
  readOnly,
  onChange,
  compact = false,
}: {
  value: CustomerActivityLed;
  customerLabel: string;
  partnerLabel: string;
  readOnly?: boolean;
  onChange: (value: CustomerActivityLed) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={`${customerLabel} or ${partnerLabel}`}
      className={compact ? "shrink-0" : "mt-8 border-t border-[#E8E5F8] pt-6"}
    >
      <div
        className={clsx(
          "inline-flex rounded-md border border-[#d4c9f6] bg-[#faf8ff] p-0.5",
          compact ? "h-9 max-w-[min(100%,18rem)]" : "w-full",
        )}
      >
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onChange("customer")}
          className={clsx(
            "flex items-center justify-center rounded font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tile-drawer-primary)]",
            compact ? "h-full px-2.5 text-[11px]" : "flex-1 px-3 py-2.5 text-xs",
            value === "customer"
              ? "bg-[var(--tile-drawer-primary)] text-white shadow-sm hover:bg-[var(--tile-drawer-primary-hover)]"
              : "text-[#4a2b7a] hover:bg-[#efe6ff]",
            readOnly && "cursor-not-allowed opacity-60",
          )}
        >
          {customerLabel}
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onChange("partner")}
          className={clsx(
            "flex items-center justify-center rounded font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--tile-drawer-primary)]",
            compact ? "h-full px-2.5 text-[11px]" : "flex-1 px-3 py-2.5 text-xs",
            value === "partner"
              ? "bg-[var(--tile-drawer-primary)] text-white shadow-sm hover:bg-[var(--tile-drawer-primary-hover)]"
              : "text-[#4a2b7a] hover:bg-[#efe6ff]",
            readOnly && "cursor-not-allowed opacity-60",
          )}
        >
          {partnerLabel}
        </button>
      </div>
    </div>
  );
}

function StandardDrawerBody({
  tile,
  library,
  showAdsDecisioningAttendees,
  onNavigateToCustomerRolesChart,
  brazeAttendeeJump,
  aiDecisioningTypography,
  readOnly,
  onDescriptionCommit,
  onAgendaCommit,
  onAttendeesCommit,
  onResourcesCommit,
  onDesiredOutcomesCommit,
  onLevelOfEffortCommit,
  editorKey,
}: {
  tile: TileRecord;
  library: TileLibraryEntry;
  showAdsDecisioningAttendees: boolean;
  onNavigateToCustomerRolesChart?: () => void;
  brazeAttendeeJump?: BrazeAttendeeJumpConfig;
  aiDecisioningTypography?: boolean;
  readOnly?: boolean;
  onDescriptionCommit: (value: string) => void;
  onAgendaCommit: (value: string) => void;
  onAttendeesCommit: (value: string) => void;
  onResourcesCommit: (value: string) => void;
  onDesiredOutcomesCommit: (value: string) => void;
  onLevelOfEffortCommit: (value: string) => void;
  editorKey: string;
}) {
  return (
    <div className="mt-8 text-[#2F2354]">
      <EditableDescriptionSection
        libraryDescription={library.description}
        sheetDescription={tile.Description ?? ""}
        readOnly={readOnly}
        aiDecisioningTypography={aiDecisioningTypography}
        onCommit={onDescriptionCommit}
        editorKey={editorKey}
      />

      {tile.Category !== "customer_activity" ? (
        <EditableBulletListSection
          icon={Calendar}
          title="Agenda"
          libraryLines={library.agenda}
          sheetText={tile.Agenda}
          onCommit={onAgendaCommit}
          readOnly={readOnly}
          editorKey={editorKey}
          aiDecisioningTypography={aiDecisioningTypography}
        />
      ) : null}

      {showAdsDecisioningAttendees ? (
        <IconSection
          icon={Users}
          title="Open roles chart"
          titleClassName={aiDecisioningTypography ? "text-[17px]" : "text-base"}
        >
          <AdsDecisioningStudioAttendees
            onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
          />
        </IconSection>
      ) : null}

      <EditableBulletListSection
        icon={Users}
        title="Suggested Attendees"
        libraryLines={library.suggested_attendees}
        sheetText={tile.Attendees}
        onCommit={onAttendeesCommit}
        readOnly={readOnly}
        editorKey={editorKey}
        aiDecisioningTypography={aiDecisioningTypography}
        brazeAttendeeJump={brazeAttendeeJump}
      />

      <EditableBulletListSection
        icon={Target}
        title="Desired Outcomes"
        libraryLines={library.desired_outcomes}
        sheetText={tile.Desired_Outcomes}
        onCommit={onDesiredOutcomesCommit}
        readOnly={readOnly}
        editorKey={editorKey}
        aiDecisioningTypography={aiDecisioningTypography}
      />

      <EditableResourcesSection
        tileResources={tile.Resources}
        library={library}
        onCommit={onResourcesCommit}
        readOnly={readOnly}
        editorKey={editorKey}
        aiDecisioningTypography={aiDecisioningTypography}
      />

      {tile.Category === "customer_activity" ? (
        <EditableLevelOfEffortSection
          sheetText={tile.Level_Of_Effort ?? ""}
          readOnly={readOnly}
          aiDecisioningTypography={aiDecisioningTypography}
          onCommit={onLevelOfEffortCommit}
          editorKey={editorKey}
        />
      ) : null}

    </div>
  );
}

export function TileDrawer({
  tile,
  config,
  onClose,
  onNavigateToCustomerRolesChart,
  brazeAttendeeJump,
  notesValue,
  onNotesCommit,
  onNotesOkay,
  notesOkayPending,
  readOnly = false,
  guestMode = false,
  notesEditorKey,
  drawerContentDirty = true,
  onDrawerTitleCommit,
  onDrawerDescriptionCommit,
  onDrawerAgendaCommit,
  onDrawerAttendeesCommit,
  onDrawerResourcesCommit,
  onDrawerDesiredOutcomesCommit,
  onDrawerLevelOfEffortCommit,
  onDrawerActivityLedCommit,
  showDeleteTile,
  onDeleteTilePress,
  deleteTilePending,
}: Props) {
  const library = tile ? getTileLibraryEntry(tile.Tile_ID) : null;

  const lockTileCopy = readOnly || guestMode;
  const lockNotes = readOnly && !guestMode;

  const open = tile != null;

  const showAdsDecisioningAttendees =
    !!tile &&
    config.Product_Type === "AI Decisioning Studio" &&
    tile.Tile_ID.startsWith("ads_");

  const aiDecisioningTypography = config.Product_Type === "AI Decisioning Studio";

  const activityLedLabels = useMemo(() => customerActivityLedLabels(config), [config]);

  const showCustomerActivityLedToggle =
    !!tile &&
    tile.Category === "customer_activity" &&
    Boolean(config.handsOnKeyboardSupport);

  const drawerActivityLed = tile ? parseCustomerActivityLed(tile.activityLed) : "customer";

  const categoryBadgeLabel = tile
    ? drawerCategoryBadgeLabel(tile.Category, config, drawerActivityLed)
    : "";

  const drawerAccentStyle = useMemo((): CSSProperties => {
    const primary = parseHexColorOptional(config.buttonColor) ?? DEFAULT_TOOLBAR_BUTTON_HEX;
    const hover = toolbarPrimaryHoverHex(primary);
    return {
      ["--tile-drawer-primary" as string]: primary,
      ["--tile-drawer-primary-hover" as string]: hover,
    } as CSSProperties;
  }, [config.buttonColor]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[90] cursor-default bg-black/40 backdrop-blur-[2px]"
          aria-label="Close details panel"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 right-0 z-[100] flex w-full max-w-md flex-col overflow-hidden border-l border-[#C9C4EF] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        style={drawerAccentStyle}
        aria-hidden={!open}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8E5F8] bg-white px-5 py-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p
              className={clsx(
                "font-semibold uppercase tracking-wide text-[#6B5A9A]",
                aiDecisioningTypography ? "text-sm" : "text-xs",
              )}
            >
              Details
            </p>
            {tile ? (
              <DoubleClickTitleBlock
                displayTitle={adsChevronDisplayTitle(tile, config.channels)}
                editTitle={tile.Title}
                onCommit={onDrawerTitleCommit}
                readOnly={lockTileCopy}
                editorKey={notesEditorKey}
                headingClassName={clsx(
                  "mt-1 font-semibold leading-snug text-[#1a102b]",
                  aiDecisioningTypography ? "text-[22px]" : "text-xl",
                )}
              />
            ) : null}
            {tile ? (
              <span
                className={clsx(
                  "mt-2 inline-block rounded-full bg-[#ece8f4] px-3 py-1 font-medium text-[#300266]",
                  aiDecisioningTypography ? "text-sm" : "text-xs",
                )}
              >
                {categoryBadgeLabel}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              "flex shrink-0 items-center gap-1 rounded-md bg-[var(--tile-drawer-primary)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--tile-drawer-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tile-drawer-primary)]",
            )}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2.5} aria-hidden />
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-14 pt-2">
          {tile && library &&
            (tile.Category === "milestone" ? (
              <MilestoneDrawerBody
                tile={tile}
                library={library}
                showAdsDecisioningAttendees={showAdsDecisioningAttendees}
                onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
                brazeAttendeeJump={brazeAttendeeJump}
                aiDecisioningTypography={aiDecisioningTypography}
                readOnly={lockTileCopy}
                onDescriptionCommit={onDrawerDescriptionCommit}
                onAttendeesCommit={onDrawerAttendeesCommit}
                editorKey={notesEditorKey}
              />
            ) : (
              <StandardDrawerBody
                tile={tile}
                library={library}
                showAdsDecisioningAttendees={showAdsDecisioningAttendees}
                onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
                brazeAttendeeJump={brazeAttendeeJump}
                aiDecisioningTypography={aiDecisioningTypography}
                readOnly={lockTileCopy}
                onDescriptionCommit={onDrawerDescriptionCommit}
                onAgendaCommit={onDrawerAgendaCommit}
                onAttendeesCommit={onDrawerAttendeesCommit}
                onResourcesCommit={onDrawerResourcesCommit}
                onDesiredOutcomesCommit={onDrawerDesiredOutcomesCommit}
                onLevelOfEffortCommit={onDrawerLevelOfEffortCommit}
                editorKey={notesEditorKey}
              />
            ))}
          {tile ? (
            <TileNotesSection
              notesValue={notesValue}
              onNotesCommit={onNotesCommit}
              onNotesOkay={onNotesOkay}
              notesOkayPending={notesOkayPending}
              readOnly={lockNotes}
              aiDecisioningTypography={aiDecisioningTypography}
              notesEditorKey={notesEditorKey}
              drawerContentDirty={drawerContentDirty}
              showDeleteTile={showDeleteTile}
              onDeleteTilePress={onDeleteTilePress}
              deleteTilePending={deleteTilePending}
              showActivityLedToggle={showCustomerActivityLedToggle}
              activityLed={drawerActivityLed}
              activityLedCustomerLabel={activityLedLabels.customer}
              activityLedPartnerLabel={activityLedLabels.partner}
              onActivityLedChange={onDrawerActivityLedCommit}
              activityLedReadOnly={lockTileCopy}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}
