import os
import json
import subprocess
from pathlib import Path

ROOTS = [
    Path(r"C:\Users\20961\.openclaw\skills"),
    Path(r"C:\Users\20961\.openclaw\workspace\skills"),
]

# Skills observed in screenshots
SKILLS = [
    "self-improving-agent",
    "summarize",
    "agent-browser",
    "skill-vetter",
    "gog",
    "ontology",
    "github",
    "proactive-agent",
    "self-improving-proactive",
    "multi-search-engine",
    "humanizer",
    "super-design",
    "stock-analysis",
    "elite-longterm-memory",
    "api-gateway",
    "evolver",
    "superpowers",
    "superpowers/systematic-debugging",
    "superpowers/test-driven-development",
    "superpowers/writing-plans",
    "superpowers/code-review",
    "qa",
    "investigate",
    "careful",
    "cso",
    "office-hours",
    "review",
    "data-analyst",
    "contract-review",
]

# Load openclaw skills list (for bundled/eligible info)
try:
    raw = subprocess.check_output(["openclaw", "skills", "list", "--json"], text=True, encoding="utf-8", errors="replace")
    oc = json.loads(raw)
    oc_map = {s.get("name"): s for s in oc.get("skills", [])}
except Exception:
    oc_map = {}

print("skill\tfolder_present\topenclaw_known\teligible\tsource\tpaths")

for s in SKILLS:
    paths = []
    # only exact folder name match (no prefix wildcards) to avoid collisions
    for root in ROOTS:
        p = root / s
        if p.is_dir():
            paths.append(str(p))

    folder_present = "YES" if paths else "NO"

    # openclaw skill names don't include slashes; treat superpowers/* as unknown
    oc_key = s if "/" not in s else s.split("/")[0]
    oc_entry = oc_map.get(oc_key)

    openclaw_known = "YES" if oc_entry else "NO"
    eligible = (str(bool(oc_entry.get("eligible"))) if oc_entry else "")
    source = (oc_entry.get("source", "") if oc_entry else "")

    print(f"{s}\t{folder_present}\t{openclaw_known}\t{eligible}\t{source}\t" + "; ".join(paths))
