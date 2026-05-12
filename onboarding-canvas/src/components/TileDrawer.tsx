"use client";

import {
  adsChevronDisplayTitle,
  AI_DECISIONING_STUDIO_TEAM_ROWS,
  getCustomerExamplesForConfig,
  getTileLibraryEntry,
} from "@/lib/constants";
import { mergeLinesPreferSheet, parseBulletLines } from "@/lib/tile-text-bullets";
import { ConfigRecord, TileCategory, TileLibraryEntry, TileLibraryLink, TileRecord } from "@/lib/types";
import {
  BookOpen,
  Calendar,
  Check,
  ListChecks,
  NotepadText,
  PartyPopper,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  tile: TileRecord | null;
  config: ConfigRecord;
  onClose: () => void;
  /** AI Decisioning Studio: scroll main page to Customer Roles chart (closes drawer). */
  onNavigateToCustomerRolesChart?: () => void;
  /** Braze Core: scroll to a row in the on-page Recommended Resources / Roles table (closes drawer). */
  onNavigateToBrazeResourceRow?: (rowElementId: string) => void;
  /** Braze Core: linked persona labels for Suggested Attendees (matches {@link getBrazeCoreResourceDrawerLinks}). */
  brazeCoreResourceLinks?: { id: string; label: string }[];
  /** Braze Core + AI Decisioning Studio: in-memory notes text (may differ from sheet until Save / Save layout). */
  notesValue: string;
  onNotesChange: (value: string) => void;
  /** Persist notes / title / description for this tile to Caboodle now (PATCH). Returns whether the request succeeded. */
  onNotesOkay: () => boolean | Promise<boolean>;
  notesOkayPending?: boolean;
  readOnly?: boolean;
  /** Stable id for the open tile — resets the post-save checkmark when switching tiles. */
  notesEditorKey: string;
  /** When false, drawer Save is disabled (nothing unsaved for this tile). */
  drawerContentDirty?: boolean;
  /** In-memory title edits (double-click header); merged in parent until Save. */
  onDrawerTitleCommit: (title: string) => void;
  /** In-memory description edits (double-click description); merged in parent until Save. */
  onDrawerDescriptionCommit: (description: string) => void;
  /** Braze Core: all tiles; AI Decisioning: custom tiles only. Opens confirmation in parent. */
  showDeleteTile?: boolean;
  onDeleteTilePress?: () => void;
  deleteTilePending?: boolean;
};

const CATEGORY_LABEL: Record<TileCategory, string> = {
  onboarding_session: "Onboarding Session",
  customer_activity: "Customer Activity",
  milestone: "Milestone",
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
}: {
  icon: LucideIcon;
  title: string;
  /** Defaults to `text-base`; use `text-[17px]` for AI Decisioning Studio (+2px). */
  titleClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[#801ED7]" aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={clsx("font-semibold text-[#2c1650]", titleClassName ?? "text-base")}>
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

function TileNotesSection({
  notesValue,
  onNotesChange,
  onNotesOkay,
  notesOkayPending,
  readOnly,
  aiDecisioningTypography,
  notesEditorKey,
  drawerContentDirty,
  showDeleteTile,
  onDeleteTilePress,
  deleteTilePending,
}: {
  notesValue: string;
  onNotesChange: (value: string) => void;
  onNotesOkay: () => boolean | Promise<boolean>;
  notesOkayPending?: boolean;
  readOnly?: boolean;
  aiDecisioningTypography?: boolean;
  notesEditorKey: string;
  drawerContentDirty?: boolean;
  showDeleteTile?: boolean;
  onDeleteTilePress?: () => void;
  deleteTilePending?: boolean;
}) {
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
        <textarea
          value={notesValue}
          onChange={(e) => onNotesChange(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          rows={4}
          placeholder={placeholder}
          aria-label="Tile notes"
          className={clsx(
            "w-full resize-y rounded-lg border border-[#d4c9f6] bg-white px-3 py-2.5 text-[#2F2354] shadow-inner outline-none focus:border-[#8b30e7]",
            bodyText,
            "min-h-[5.5rem] placeholder:text-[#b8aed4]",
            readOnly && "cursor-not-allowed bg-[#f8f6fd] text-[#6B5A9A]",
          )}
        />
        {!readOnly ? (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
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
                showSavedCheck ? "bg-emerald-600 hover:bg-emerald-600" : "bg-[#801ED7] hover:bg-[#6b18b8]",
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
                className="font-semibold text-[#300266] no-underline hover:underline"
              >
                {row.role}
              </button>
            ) : (
              <span className="font-semibold text-[#300266]">{row.role}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BrazeCoreResourceAttendees({
  links,
  onNavigateToRow,
}: {
  links: { id: string; label: string }[];
  onNavigateToRow?: (rowElementId: string) => void;
}) {
  const jump = onNavigateToRow;
  return (
    <ul className="space-y-2 pl-1 text-[#2F2354]">
      {links.map((row) => (
        <li key={row.id} className="flex gap-2 text-[15px] leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]" aria-hidden />
          <div className="min-w-0">
            {jump ? (
              <button
                type="button"
                onClick={() => jump(row.id)}
                className="text-left font-semibold text-[#300266] no-underline hover:underline"
              >
                {row.label}
              </button>
            ) : (
              <span className="font-semibold text-[#300266]">{row.label}</span>
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
  brazeCoreResourceLinks,
  onNavigateToBrazeResourceRow,
  aiDecisioningTypography,
  readOnly,
  onDescriptionCommit,
  editorKey,
}: {
  tile: TileRecord;
  library: TileLibraryEntry;
  showAdsDecisioningAttendees: boolean;
  onNavigateToCustomerRolesChart?: () => void;
  brazeCoreResourceLinks?: { id: string; label: string }[];
  onNavigateToBrazeResourceRow?: (rowElementId: string) => void;
  /** Larger copy (+2px) for AI Decisioning Studio configs. */
  aiDecisioningTypography?: boolean;
  readOnly?: boolean;
  onDescriptionCommit: (value: string) => void;
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
        <IconSection icon={Users} title="Suggested Attendees" titleClassName={sectionTitle}>
          <AdsDecisioningStudioAttendees
            onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
          />
        </IconSection>
      ) : brazeCoreResourceLinks && brazeCoreResourceLinks.length > 0 ? (
        <IconSection icon={Users} title="Suggested Attendees" titleClassName={sectionTitle}>
          <BrazeCoreResourceAttendees
            links={brazeCoreResourceLinks}
            onNavigateToRow={onNavigateToBrazeResourceRow}
          />
        </IconSection>
      ) : null}

      <IconSection icon={ListChecks} title="Success Checklist" titleClassName={sectionTitle}>
        <TextSectionBody items={library.success_checklist} itemClassName={bodyText} />
      </IconSection>

      <IconSection icon={PartyPopper} title="Strategic Impact" titleClassName={sectionTitle}>
        <TextSectionBody items={library.strategic_impact} itemClassName={bodyText} />
      </IconSection>
    </div>
  );
}

function StandardDrawerBody({
  tile,
  library,
  customerExamplesMerged,
  showAdsDecisioningAttendees,
  onNavigateToCustomerRolesChart,
  brazeCoreResourceLinks,
  onNavigateToBrazeResourceRow,
  aiDecisioningTypography,
  readOnly,
  onDescriptionCommit,
  editorKey,
}: {
  tile: TileRecord;
  library: TileLibraryEntry;
  customerExamplesMerged: TileLibraryLink[];
  showAdsDecisioningAttendees: boolean;
  onNavigateToCustomerRolesChart?: () => void;
  brazeCoreResourceLinks?: { id: string; label: string }[];
  onNavigateToBrazeResourceRow?: (rowElementId: string) => void;
  aiDecisioningTypography?: boolean;
  readOnly?: boolean;
  onDescriptionCommit: (value: string) => void;
  editorKey: string;
}) {
  const bodyText = aiDecisioningTypography ? "text-[15px]" : "text-sm";
  const sectionTitle = aiDecisioningTypography ? "text-[17px]" : "text-base";

  const mergedAttendees = mergeLinesPreferSheet(tile.Attendees, library.suggested_attendees);
  const mergedOutcomes = mergeLinesPreferSheet(tile.Desired_Outcomes, library.desired_outcomes);
  const resourceLinesFromSheet = parseBulletLines(tile.Resources);

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

      {library.agenda.length > 0 ? (
        <IconSection icon={Calendar} title="Agenda" titleClassName={sectionTitle}>
          <TextSectionBody items={library.agenda} itemClassName={bodyText} />
        </IconSection>
      ) : null}

      <IconSection icon={Users} title="Suggested Attendees" titleClassName={sectionTitle}>
        {showAdsDecisioningAttendees ? (
          <AdsDecisioningStudioAttendees
            onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
          />
        ) : brazeCoreResourceLinks && brazeCoreResourceLinks.length > 0 ? (
          <BrazeCoreResourceAttendees
            links={brazeCoreResourceLinks}
            onNavigateToRow={onNavigateToBrazeResourceRow}
          />
        ) : (
          <TextSectionBody items={mergedAttendees} itemClassName={bodyText} />
        )}
      </IconSection>

      {mergedOutcomes.length > 0 ? (
        <IconSection icon={Target} title="Desired Outcomes" titleClassName={sectionTitle}>
          <TextSectionBody items={mergedOutcomes} itemClassName={bodyText} />
        </IconSection>
      ) : null}

      <IconSection icon={BookOpen} title="Resources" titleClassName={sectionTitle}>
        {resourceLinesFromSheet.length > 0 ? (
          <TextSectionBody items={resourceLinesFromSheet} itemClassName={bodyText} />
        ) : (
          <LinksSectionBody items={library.resources} itemClassName={bodyText} />
        )}
      </IconSection>

      <IconSection icon={Sparkles} title="Customer Examples" titleClassName={sectionTitle}>
        <LinksSectionBody items={customerExamplesMerged} itemClassName={bodyText} />
      </IconSection>
    </div>
  );
}

export function TileDrawer({
  tile,
  config,
  onClose,
  onNavigateToCustomerRolesChart,
  onNavigateToBrazeResourceRow,
  brazeCoreResourceLinks,
  notesValue,
  onNotesChange,
  onNotesOkay,
  notesOkayPending,
  readOnly = false,
  notesEditorKey,
  drawerContentDirty = true,
  onDrawerTitleCommit,
  onDrawerDescriptionCommit,
  showDeleteTile,
  onDeleteTilePress,
  deleteTilePending,
}: Props) {
  const library = tile ? getTileLibraryEntry(tile.Tile_ID) : null;
  const configCustomerExamples = getCustomerExamplesForConfig({
    industry: config.Industry,
    durationWeeks: config.Duration_Weeks,
    productType: config.Product_Type,
  });

  const customerExamplesMerged: TileLibraryLink[] = [
    ...(library?.customer_examples ?? []),
    ...configCustomerExamples.map((c) => ({ label: c.label, url: c.url })),
  ];

  const open = tile != null;

  const showAdsDecisioningAttendees =
    !!tile &&
    config.Product_Type === "AI Decisioning Studio" &&
    tile.Tile_ID.startsWith("ads_");

  const aiDecisioningTypography = config.Product_Type === "AI Decisioning Studio";

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
                readOnly={readOnly}
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
                {CATEGORY_LABEL[tile.Category]}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              "flex shrink-0 items-center gap-2 rounded-lg bg-[#801ED7] px-4 py-2.5 font-semibold text-white shadow-md hover:bg-[#6b18b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#801ED7]",
              aiDecisioningTypography ? "text-base" : "text-sm",
            )}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} aria-hidden />
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
                brazeCoreResourceLinks={brazeCoreResourceLinks}
                onNavigateToBrazeResourceRow={onNavigateToBrazeResourceRow}
                aiDecisioningTypography={aiDecisioningTypography}
                readOnly={readOnly}
                onDescriptionCommit={onDrawerDescriptionCommit}
                editorKey={notesEditorKey}
              />
            ) : (
              <StandardDrawerBody
                tile={tile}
                library={library}
                customerExamplesMerged={customerExamplesMerged}
                showAdsDecisioningAttendees={showAdsDecisioningAttendees}
                onNavigateToCustomerRolesChart={onNavigateToCustomerRolesChart}
                brazeCoreResourceLinks={brazeCoreResourceLinks}
                onNavigateToBrazeResourceRow={onNavigateToBrazeResourceRow}
                aiDecisioningTypography={aiDecisioningTypography}
                readOnly={readOnly}
                onDescriptionCommit={onDrawerDescriptionCommit}
                editorKey={notesEditorKey}
              />
            ))}
          {tile ? (
            <TileNotesSection
              notesValue={notesValue}
              onNotesChange={onNotesChange}
              onNotesOkay={onNotesOkay}
              notesOkayPending={notesOkayPending}
              readOnly={readOnly}
              aiDecisioningTypography={aiDecisioningTypography}
              notesEditorKey={notesEditorKey}
              drawerContentDirty={drawerContentDirty}
              showDeleteTile={showDeleteTile}
              onDeleteTilePress={onDeleteTilePress}
              deleteTilePending={deleteTilePending}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}
