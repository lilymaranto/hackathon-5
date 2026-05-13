"use client";

import {
  BRAZE_RESOURCE_ROW_ID_PREFIX,
  filterGrowthSilverRows,
  filterStandardBrazeRows,
  GROWTH_SILVER_RESOURCE_ROWS,
  type GrowthSilverResourceRow,
  type StandardBrazeResourceRow,
  STANDARD_BRAZE_RESOURCE_ROWS,
} from "@/lib/braze-core-resources-data";
import type { ChannelPreferences, PlanOptionId } from "@/lib/types";

const EMAIL_SETUP_HREF =
  "https://www.braze.com/docs/user_guide/message_building_by_channel/email/email_setup/";

/** Shared grid lines for resource tables (readable row/column boundaries). */
const CELL_GRID = "border border-[#E8E5F8]";

function EmailSetupLink({ className }: { className?: string }) {
  return (
    <a
      href={EMAIL_SETUP_HREF}
      target="_blank"
      rel="noreferrer"
      className={className ?? "font-medium text-[#801ED7] underline decoration-[#801ED7]/50 underline-offset-2 hover:decoration-[#801ED7]"}
    >
      Email Setup
    </a>
  );
}

/** Renders a responsibility line, turning the Email Setup reference into a link when present. */
function ResponsibilityLine({ text }: { text: string }) {
  if (text.includes("Email Setup")) {
    const parts = text.split("Email Setup");
    return (
      <span>
        {parts[0]}
        <EmailSetupLink />
        {parts.slice(1).join("Email Setup")}
      </span>
    );
  }
  return <>{text}</>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((line) => (
        <li key={line} className="flex gap-2 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]" aria-hidden />
          <span>
            <ResponsibilityLine text={line} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function RiskList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((line) => (
        <li key={line} className="flex gap-2 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#91186E]/70" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function GrowthSilverTable({ rows }: { rows: GrowthSilverResourceRow[] }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[min(100%,920px)] table-fixed border-collapse text-left text-[12px] text-[#2F2354]">
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          <col />
          <col style={{ width: "18%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr className="bg-[#faf8ff]">
            <th className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold text-[#2c1650] sm:px-4`}>
              Team
            </th>
            <th className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold text-[#2c1650] sm:px-4`}>
              Role
            </th>
            <th className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold text-[#2c1650] sm:px-4`}>
              Responsibilities
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Delivery Risk If Not Identified
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[13px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Discovery
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[13px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Planning
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[13px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Execution
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              id={`${BRAZE_RESOURCE_ROW_ID_PREFIX}${row.id}`}
              className="scroll-mt-24 align-top"
            >
              <td className={`${CELL_GRID} px-3 py-3.5 font-semibold text-[#300266] sm:px-4`}>
                {row.team}
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 font-semibold text-[#300266] sm:px-4`}>
                {row.role}
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 sm:px-4`}>
                <BulletList items={row.responsibilities} />
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] leading-snug sm:px-4`}>
                <RiskList items={row.deliveryRisk} />
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] tabular-nums sm:px-4`}>
                {row.discovery}
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] tabular-nums sm:px-4`}>
                {row.planning}
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] tabular-nums sm:px-4`}>
                {row.execution}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileCell({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <p
          key={`${line}-${i}`}
          className={i === 0 ? "font-semibold text-[#300266]" : "text-[13px] font-normal text-[#5c4a7a]"}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function StandardBrazeTable({ rows }: { rows: StandardBrazeResourceRow[] }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[min(100%,980px)] table-fixed border-collapse text-left text-[12px] text-[#2F2354]">
        <colgroup>
          <col style={{ width: "16%" }} />
          <col />
          <col style={{ width: "18%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr className="bg-[#faf8ff]">
            <th className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold text-[#2c1650] sm:px-4`}>
              Profile
            </th>
            <th className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold text-[#2c1650] sm:px-4`}>
              Responsibilities
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[14px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Delivery Risk If Not Identified
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[13px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Discovery
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[13px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Planning
            </th>
            <th
              className={`${CELL_GRID} px-3 py-3.5 text-[13px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
            >
              Execution
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              id={`${BRAZE_RESOURCE_ROW_ID_PREFIX}${row.id}`}
              className="scroll-mt-24 align-top"
            >
              <td className={`${CELL_GRID} px-3 py-3.5 sm:px-4`}>
                <ProfileCell lines={row.profileLines} />
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 sm:px-4`}>
                <BulletList items={row.responsibilities} />
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] leading-snug sm:px-4`}>
                <RiskList items={row.deliveryRisk} />
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] tabular-nums sm:px-4`}>
                {row.discovery}
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] tabular-nums sm:px-4`}>
                {row.planning}
              </td>
              <td className={`${CELL_GRID} px-3 py-3.5 text-[13px] tabular-nums sm:px-4`}>
                {row.execution}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  planOptionId: PlanOptionId;
  channels: ChannelPreferences;
  /** When false, email-only rows (DNS/SSL, IT Manager) are omitted — aligned with canvas when email lane has no tiles. */
  hasEmailWorkstreamTiles: boolean;
};

export function BrazeCoreResourcesChart({
  planOptionId,
  channels,
  hasEmailWorkstreamTiles,
}: Props) {
  const email = channels.email && hasEmailWorkstreamTiles;
  const isGrowthSilver = planOptionId === "growth_silver";

  const title = isGrowthSilver ? "Recommended Resources:" : "Roles & Responsibilities";

  return (
    <div>
      <h3 className="text-center text-[24px] font-semibold leading-tight text-[#2c1650]">{title}</h3>
      <div className="mt-6">
        {isGrowthSilver ? (
          <GrowthSilverTable rows={filterGrowthSilverRows(GROWTH_SILVER_RESOURCE_ROWS, email)} />
        ) : (
          <StandardBrazeTable rows={filterStandardBrazeRows(STANDARD_BRAZE_RESOURCE_ROWS, email)} />
        )}
      </div>
    </div>
  );
}
