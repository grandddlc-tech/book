#!/usr/bin/env python3
"""Assemble src/app.html (the offline Android app) from src/page.html and tools/parts/*.js."""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
page = (ROOT / "src/page.html").read_text(encoding="utf-8")
core = (ROOT / "tools/parts/app_core.js").read_text(encoding="utf-8")
reader = (ROOT / "tools/parts/app_reader.js").read_text(encoding="utf-8")

def section(name):
    m = re.search(r"/\* ---------- " + re.escape(name) + r".*?\*/\n(.*?)(?=/\* ---------- |\}\)\(\);\n</script>)", page, re.S)
    return m.group(0)

head, rest = page.split("<script>", 1)
prelude = rest.split("/* ---------- content catalogue", 1)[0]
extra_css = """.badge{position:relative;align-self:flex-start;font-size:.68rem;font-weight:800;padding:3px 9px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;letter-spacing:.04em;margin-bottom:auto}
.badge.dim{opacity:.55}
.field .fhead{display:flex;justify-content:space-between;align-items:flex-start;gap:6px}
.field .badge{background:rgba(255,255,255,.1);margin:0}
.w.g{text-decoration:underline dotted color-mix(in srgb,var(--m1) 70%,transparent);text-underline-offset:.22em;text-decoration-thickness:1.5px}
.ctx{margin-top:10px;font-family:var(--read);font-size:.92rem;color:var(--muted);line-height:1.5}
.ctx small{display:block;font-family:var(--ui);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:2px}
</style>"""
head = head.replace("</style>", extra_css, 1)
script = ("<script>" + prelude + section("content catalogue") + core + section("speech") + section("ui helpers")
          + reader + section("VOCAB") + section("PROGRESS") + section("routing").replace("initCloud();", "loadLibrary();")
          + "})();\n</script>\n")
(ROOT / "src/app.html").write_text(head + script, encoding="utf-8")
print("src/app.html written")
