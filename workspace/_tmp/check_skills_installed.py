import os
import glob

ROOTS = [
    r"C:\Users\20961\.openclaw\skills",
    r"C:\Users\20961\.openclaw\workspace\skills",
]

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
    "self-improving",
    "multi-search-engine",
    "humanizer",
    "super-design",
    "stock-analysis",
    "elite-longterm-memory",
    "api-gateway",
    "evolver",
    "superpowers",
    "data-analyst",
    "contract-review",
    "qa",
    "investigate",
    "careful",
    "cso",
    "office-hours",
    "review",
]

for s in SKILLS:
    hits = []
    for r in ROOTS:
        if os.path.isdir(r):
            p = os.path.join(r, s)
            if os.path.isdir(p):
                hits.append(p)
            hits.extend([x for x in glob.glob(os.path.join(r, s + "*")) if os.path.isdir(x)])

    hits = sorted(set(hits))
    installed = "YES" if hits else "NO"
    print(f"{s}\t{installed}\t" + "; ".join(hits))
