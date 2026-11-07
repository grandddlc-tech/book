/* ---------- state ---------- */
const S = {
  level: LS.get("lr.level", "B2"),
  fs: LS.get("lr.fs", 1.18),
  tab: "home",
  vocab: LS.get("lr.vocab", {}),
  prog: Object.assign({ read: 0, correct: 0, answered: 0, history: [], readIds: [] }, LS.get("lr.prog", {})),
  lib: [],
  cur: null
};
if (!Array.isArray(S.prog.readIds)) S.prog.readIds = [];
function slug(w) { return "w_" + w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
function saveProg() { LS.set("lr.prog", S.prog); }
function saveWord(e) { S.vocab[e.id] = e; LS.set("lr.vocab", S.vocab); }
function delWord(id) { delete S.vocab[id]; LS.set("lr.vocab", S.vocab); }

/* ---------- library: bundled texts + new texts published on GitHub ---------- */
const REMOTE = "https://raw.githubusercontent.com/grandddlc-tech/book/ccr-a68251be-qxa4n6/content/texts.json";
function mergeLib(list) {
  const byId = new Map(S.lib.map(t => [t.id, t]));
  (list || []).forEach(t => { if (t && t.id && Array.isArray(t.paras)) byId.set(t.id, t); });
  S.lib = [...byId.values()];
}
async function loadLibrary() {
  try { const r = await fetch("texts.json"); if (r.ok) mergeLib((await r.json()).texts); } catch {}
  mergeLib(LS.get("lr.remote", []));
  if (S.tab === "home") render();
  try {
    const r = await fetch(REMOTE + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const remote = (await r.json()).texts || [];
    const before = S.lib.length;
    LS.set("lr.remote", remote);
    mergeLib(remote);
    if (S.lib.length > before) toast((S.lib.length - before) + " new text" + (S.lib.length - before > 1 ? "s" : "") + " added");
    if (S.tab === "home") render();
  } catch {}
}
const inCat = (kind, key, level) => S.lib.filter(t => t.kind === kind && t.key === key && (!level || t.level === level));
const isRead = t => S.prog.readIds.includes(t.id);
const unreadCount = (kind, key) => inCat(kind, key, S.level).filter(t => !isRead(t)).length;
