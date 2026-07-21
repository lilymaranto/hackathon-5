#!/usr/bin/env python3
"""Generate plan-gantt-seeds.json from ServCon Implementation Task List.xlsx plan tabs."""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XLSX = ROOT / "Copy of ServCon Implementation Task List.xlsx"
PLATINUM_SEED = (
    Path(__file__).resolve().parents[1] / "src/lib/enterprise-platinum-gantt-seed.json"
)
OUT = Path(__file__).resolve().parents[1] / "src/lib/plan-gantt-seeds.json"

METADATA_ALIASES: dict[str, str] = {
    "Setup Teams (Optional)": "Setup Teams",
    "Shopify Integration (Optional)": "Shopify Integration",
    "Build Priority 1 Campaigns & Canvases": "Build Campaigns & Canvases",
    "Build Priority 2 Campaigns & Canvases": "Build Campaigns & Canvases",
    "Configure Opt-In & Opt-Out": "Configure Opt-In & Opt-Out Keywords",
}

PLATINUM_PLAN_SHEET = "Enterprise Platinum Plan"

SECTION_WORKSTREAM: dict[str, str] = {
    "Project Management & Governance": "gantt_admin",
    "Data": "gantt_data",
    "Technical": "gantt_tech",
    "Audiences": "gantt_audiences",
    "Channels": "gantt_channels",
    "Email": "gantt_email",
    "SMS": "gantt_sms",
    "WhatsApp": "gantt_whatsapp",
    "Web/Mobile Channels": "gantt_web_mobile",
    "Messaging": "gantt_messaging",
    "Message Build": "gantt_messaging",
    "Analytics": "gantt_analytics",
}

PLAN_SHEETS: dict[str, str] = {
    "enterprise_gold": "Enterprise Gold Plan",
    "ignite_gold": "Ignite Gold Plan",
    "ignite_silver": "Ignite Silver Plan",
    "quickstart_gold": "Quickstart Gold Plan",
    "quickstart_silver": "Quickstart Silver Plan",
    "growth_silver": "Growth Silver Plan",
}


def slug(name: str) -> str:
    s = re.sub(r"\([^)]*\)", "", name)
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def layout_from_marks(marks: dict[str, str]) -> tuple[int, int, int] | None:
    if not marks:
        return None
    keys = sorted(int(k) for k in marks)
    ones = [k for k in keys if marks[str(k)] == "1"]
    if not ones:
        return None
    start = keys[0]
    end = keys[-1]
    return start, end - start + 1, len(ones)


def read_workbook(path: Path):
    z = zipfile.ZipFile(path)
    ss: list[str] = []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
        texts = []
        for t in si.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"):
            if t.text:
                texts.append(t.text)
        ss.append("".join(texts))

    def col_num(c: str) -> int:
        n = 0
        for ch in c:
            n = n * 26 + ord(ch) - 64
        return n

    def col_row(cell_ref: str):
        m = re.match(r"([A-Z]+)(\d+)", cell_ref)
        return m.group(1), int(m.group(2))

    def read_sheet(name: str):
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rid = None
        for s in wb.findall(
            ".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet"
        ):
            if s.attrib.get("name") == name:
                rid = s.attrib.get(
                    "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
                )
                break
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        target = None
        for r in rels:
            if r.attrib.get("Id") == rid:
                target = r.attrib.get("Target")
                break
        sheet_path = "xl/" + target.lstrip("/")
        sheet = ET.fromstring(z.read(sheet_path))
        rows: dict[int, dict[str, str]] = defaultdict(dict)
        for c in sheet.findall(
            ".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"
        ):
            ref = c.attrib.get("r")
            col, row = col_row(ref)
            v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
            if v is None:
                continue
            val = v.text
            if c.attrib.get("t") == "s":
                val = ss[int(val)]
            rows[row][col] = val
        return rows, col_num

    return read_sheet


def parse_plan_sheet(read_sheet, sheet_name: str):
    rows, col_num = read_sheet(sheet_name)
    week_cols: list[str] = []
    for col, v in sorted(rows.get(2, {}).items(), key=lambda x: col_num(x[0])):
        if col == "A":
            continue
        try:
            float(v)
            week_cols.append(col)
        except ValueError:
            pass

    section: str | None = None
    parsed: list[dict] = []
    for r in sorted(rows.keys()):
        if r < 4:
            continue
        a = rows[r].get("A", "").strip()
        if not a or a == "Task Name":
            continue
        b = rows[r].get("B", "").strip()
        optional = "N"
        if sheet_name == "Quickstart Gold Plan" and b in ("Y", "N"):
            optional = b

        marks: dict[str, str] = {}
        for i, col in enumerate(week_cols, start=1):
            v = rows[r].get(col, "")
            if v in ("1.0", "1"):
                marks[str(i)] = "1"
            elif v in ("x", "X"):
                marks[str(i)] = "x"

        if not marks:
            if not any(rows[r].get(c, "") for c in week_cols):
                section = a
                continue

        sec = section or ""
        if sec == "Administer/Platform Governance":
            sec = "Project Management & Governance"

        parsed.append(
            {
                "taskName": a,
                "section": sec,
                "optional": optional,
                "weekMarks": marks,
            }
        )

    return len(week_cols), parsed


def metadata_lookup(rows: list[dict]) -> dict[str, dict]:
    by_name = {r["taskName"]: r for r in rows}
    for task_name, base_name in METADATA_ALIASES.items():
        if base_name in by_name and task_name not in by_name:
            by_name[task_name] = by_name[base_name]
    return by_name


def optional_flag(task_name: str, sheet_optional: str, plan_id: str, base_optional: str | None) -> str:
    if "(Optional)" in task_name:
        return "Y"
    if plan_id == "quickstart_gold":
        return sheet_optional
    if base_optional is not None:
        return base_optional
    return "N"


def rows_from_plan_tasks(
    tasks: list[dict],
    by_name: dict[str, dict],
    plan_id: str,
) -> list[dict]:
    used_keys: set[str] = set()
    rows_out: list[dict] = []

    for t in tasks:
        task_name = t["taskName"]
        base_name = METADATA_ALIASES.get(task_name, task_name)
        base = by_name.get(base_name)

        task_key = slug(task_name)
        if task_key in used_keys:
            task_key = f"{task_key}_{len(used_keys)}"
        used_keys.add(task_key)

        marks = t["weekMarks"]
        layout = layout_from_marks(marks)
        section = t["section"] or (base.get("section") if base else "") or ""
        if base:
            row = deepcopy(base)
            row["taskKey"] = task_key
            row["taskName"] = task_name
            row["section"] = section
            row["workstream"] = SECTION_WORKSTREAM.get(section, row.get("workstream", "gantt_messaging"))
            row["optional"] = optional_flag(
                task_name, t["optional"], plan_id, base.get("optional"),
            )
        else:
            row = {
                "taskKey": task_key,
                "taskName": task_name,
                "section": section,
                "workstream": SECTION_WORKSTREAM.get(section, "gantt_messaging"),
                "optional": optional_flag(task_name, t["optional"], plan_id, None),
                "description": "",
                "requiredStakeholders": "",
                "desiredOutcomes": "",
                "resources": "",
                "levelOfEffort": "",
                "startWeek": 1,
                "spanWeeks": 1,
                "minSpanWeeks": 1,
            }

        row["weekMarks"] = marks
        if layout:
            row["startWeek"], row["spanWeeks"], row["minSpanWeeks"] = layout
        rows_out.append(row)

    return rows_out


def main() -> None:
    legacy_platinum = json.loads(PLATINUM_SEED.read_text())
    by_name = metadata_lookup(legacy_platinum)
    read_sheet = read_workbook(XLSX)

    platinum_weeks, platinum_tasks = parse_plan_sheet(read_sheet, PLATINUM_PLAN_SHEET)
    platinum_rows = rows_from_plan_tasks(platinum_tasks, by_name, "12_week")
    PLATINUM_SEED.write_text(json.dumps(platinum_rows, indent=2) + "\n")
    print("platinum weeks", platinum_weeks, "tasks", len(platinum_rows), "->", PLATINUM_SEED)

    by_name = metadata_lookup(platinum_rows)

    out: dict[str, dict] = {}
    for plan_id, sheet in PLAN_SHEETS.items():
        week_count, tasks = parse_plan_sheet(read_sheet, sheet)
        rows_out = rows_from_plan_tasks(tasks, by_name, plan_id)
        out[plan_id] = {"timelineWeeks": week_count, "rows": rows_out}
        print(plan_id, "weeks", week_count, "tasks", len(rows_out))

    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
