#!/usr/bin/env python3
"""Compile content/texts/*.txt into content/texts.json for the Lumen Reader app.

Text file format:
    id: war-b2-1
    kind: story | fact
    key: war | love | horror | science | medicine | ...
    level: B2 | C1
    title: The title
    ---
    Paragraphs separated by blank lines.
    === GLOSSARY
    surface form | lemma | pos | /ipa/ | Persian meaning | English example sentence
    === QUIZ
    Q: Type | Question text
    A) option
    *B) correct option (marked with *)
    C) option
    D) option
    E: explanation
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "texts"
OUT = ROOT / "content" / "texts.json"


def parse(path):
    raw = path.read_text(encoding="utf-8")
    head, rest = raw.split("\n---\n", 1)
    meta = dict(line.split(":", 1) for line in head.strip().splitlines())
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    body, rest = rest.split("=== GLOSSARY", 1)
    gloss_raw, quiz_raw = rest.split("=== QUIZ", 1)
    paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    gloss = {}
    for line in gloss_raw.strip().splitlines():
        if not line.strip():
            continue
        parts = [x.strip() for x in line.split("|")]
        if len(parts) != 6:
            sys.exit(f"{path.name}: bad glossary line: {line}")
        surface, lemma, pos, ipa, fa, ex = parts
        gloss[surface.lower()] = {"w": lemma, "pos": pos, "ipa": ipa, "fa": fa, "ex": ex}
    quiz, cur = [], None
    for line in quiz_raw.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("Q:"):
            t, q = line[2:].split("|", 1)
            cur = {"type": t.strip(), "q": q.strip(), "options": [], "answer": -1, "explanation": ""}
            quiz.append(cur)
        elif re.match(r"^\*?[A-D]\)", line):
            if line.startswith("*"):
                cur["answer"] = len(cur["options"])
                line = line[1:]
            cur["options"].append(line[2:].strip())
        elif line.startswith("E:"):
            cur["explanation"] = line[2:].strip()
    words = len(re.findall(r"[A-Za-z][A-Za-z'’-]*", " ".join(paras)))
    for q in quiz:
        if len(q["options"]) != 4 or q["answer"] < 0:
            sys.exit(f"{path.name}: bad question: {q['q']}")
    text_lower = " ".join(paras).lower()
    missing = [k for k in gloss if not re.search(r"(?<![a-z])" + re.escape(k) + r"(?![a-z])", text_lower)]
    if missing:
        print(f"warning {path.name}: glossary words not found in text: {missing}", file=sys.stderr)
    return {
        "id": meta["id"], "kind": meta["kind"], "key": meta["key"], "level": meta["level"],
        "title": meta["title"], "words": words, "paras": paras, "gloss": gloss, "quiz": quiz,
    }


def main():
    texts = [parse(p) for p in sorted(SRC.glob("*.txt"))]
    ids = [t["id"] for t in texts]
    if len(ids) != len(set(ids)):
        sys.exit("duplicate ids")
    OUT.write_text(json.dumps({"version": 1, "texts": texts}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for t in texts:
        print(f"{t['id']:<22} {t['level']} {t['words']:>4} words  {len(t['gloss']):>3} glossary  {len(t['quiz'])} questions")
    print(f"{len(texts)} texts -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
