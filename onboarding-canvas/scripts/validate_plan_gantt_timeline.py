#!/usr/bin/env python3
"""Validate plan Gantt seeds vs Excel week marks and expected column mapping."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from generate_plan_gantt_seeds import (  # noqa: E402
    METADATA_ALIASES,
    PLAN_SHEETS,
    PLATINUM_PLAN_SHEET,
    layout_from_marks,
    parse_plan_sheet,
    read_workbook,
)

XLSX = ROOT.parent / "Copy of ServCon Implementation Task List.xlsx"
PLATINUM_SEED = ROOT / "src/lib/enterprise-platinum-gantt-seed.json"
PLAN_SEEDS = ROOT / "src/lib/plan-gantt-seeds.json"

# Keep in sync with plan-task-gantt-timeline.ts
EXPECTED = {
    "12_week": {"plan_weeks": 28, "cols_per_week": 2, "timeline_cols": 56},
    "enterprise_gold": {"plan_weeks": 28, "cols_per_week": 2, "timeline_cols": 56},
    "ignite_gold": {"plan_weeks": 20, "cols_per_week": 1, "timeline_cols": 20},
    "ignite_silver": {"plan_weeks": 20, "cols_per_week": 1, "timeline_cols": 20},
    "quickstart_gold": {"plan_weeks": 12, "cols_per_week": 1, "timeline_cols": 12},
    "quickstart_silver": {"plan_weeks": 12, "cols_per_week": 1, "timeline_cols": 12},
    "growth_silver": {"plan_weeks": 6, "cols_per_week": 8, "timeline_cols": 48},
}


def col_range(plan_id: str, start_week: int, span_weeks: int) -> tuple[int, int]:
    spec = EXPECTED[plan_id]
    cppw = spec["cols_per_week"]
    end_week = start_week + span_weeks - 1
    start_col = (start_week - 1) * cppw + 1
    end_col = min(spec["timeline_cols"], end_week * cppw)
    return start_col, end_col


def main() -> int:
    read_sheet = read_workbook(XLSX)
    plan_seeds = json.loads(PLAN_SEEDS.read_text())
    platinum = json.loads(PLATINUM_SEED.read_text())
    errors: list[str] = []

    all_plans = {"12_week": (PLATINUM_PLAN_SHEET, platinum), **{k: (v, plan_seeds[k]["rows"]) for k, v in PLAN_SHEETS.items()}}

    for plan_id, (sheet, rows) in all_plans.items():
        excel_weeks, tasks = parse_plan_sheet(read_sheet, sheet)
        spec = EXPECTED[plan_id]
        if excel_weeks != spec["plan_weeks"]:
            errors.append(f"{plan_id}: excel weeks {excel_weeks} != expected {spec['plan_weeks']}")
        if plan_id != "12_week" and plan_seeds.get(plan_id, {}).get("timelineWeeks") != spec["plan_weeks"]:
            if plan_id == "12_week":
                pass
            else:
                tw = plan_seeds.get(plan_id, {}).get("timelineWeeks")
                if tw != spec["plan_weeks"]:
                    errors.append(f"{plan_id}: seed timelineWeeks {tw} != {spec['plan_weeks']}")

        by_name = {r["taskName"]: r for r in rows}
        for t in tasks:
            name = t["taskName"]
            row = by_name.get(name)
            if not row:
                errors.append(f"{plan_id}: missing seed row {name!r}")
                continue
            layout = layout_from_marks(t["weekMarks"])
            if not layout:
                continue
            es, esp, _ = layout
            if row.get("startWeek") != es or row.get("spanWeeks") != esp:
                errors.append(
                    f"{plan_id}: {name} seed {row.get('startWeek')}/{row.get('spanWeeks')} "
                    f"!= excel {es}/{esp}"
                )

    print("Plan Gantt timeline spec:")
    for pid, spec in EXPECTED.items():
        print(f"  {pid}: {spec['plan_weeks']} excel weeks → {spec['timeline_cols']} columns "
              f"({spec['cols_per_week']} col/week)")

    if errors:
        print("\nERRORS:")
        for e in errors:
            print(" ", e)
        return 1
    print("\nOK: all plans match Excel week marks in seed JSON.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
