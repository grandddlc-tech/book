/* ---------- HOME ---------- */
function viewHome() {
  setMood("");
  const n = Object.keys(S.vocab).length;
  const atLevel = S.lib.filter(t => t.level === S.level);
  const readAtLevel = atLevel.filter(isRead).length;
  const badge = (kind, key) => { const u = unreadCount(kind, key), all = inCat(kind, key, S.level).length; return all ? `<span class="badge">${u ? u + " new" : "all read"}</span>` : `<span class="badge dim">soon</span>`; };
  app.innerHTML = `<div class="view">
  <header class="top"><div class="brand">Lumen Reader</div>
    <div class="lvl glass" role="group" aria-label="Level">${["B2", "C1"].map(l => `<button data-lvl="${l}" aria-pressed="${S.level === l}">${l}</button>`).join("")}</div></header>
  <section class="hero glass">
    <h1>Read one new text a day. Tap any word you don't know.</h1>
    <p>Stories and articles at <b style="color:#e9d5ff">${S.level}</b>, 600–900 words, each with four exam-style questions. You have read <b style="color:#e9d5ff">${readAtLevel} of ${atLevel.length}</b> texts at this level.</p>
    <div class="statline"><div><b>${S.prog.read}</b><span>Texts read</span></div><div><b>${accuracy()}%</b><span>Correct</span></div><div><b>${n}</b><span>Words saved</span></div><div><b>${avgWpm() || "–"}</b><span>Avg WPM</span></div></div>
  </section>
  <div class="sect-h"><h2>Short stories</h2><small>Fiction</small></div>
  <div class="genres">
    ${Object.entries(GENRES).map(([k, g]) => `<button class="genre ${k}" data-genre="${k}">${genreArt(k)}${badge("story", k)}<span class="gt">${g.name}</span><span class="gs">${g.blurb}</span></button>`).join("")}
  </div>
  <div class="sect-h"><h2>Non-fiction</h2><small>IELTS · IMAT style</small></div>
  <div class="fields">
    ${Object.entries(FIELDS).map(([k, f]) => `<button class="field glass" data-field="${k}" style="--fc1:${f.c[0]};--fc2:${f.c[1]}"><span class="fhead"><span class="ic"><svg viewBox="0 0 24 24">${ICON[k]}</svg></span>${badge("fact", k)}</span><b>${f.name}</b><span>${f.hint}</span></button>`).join("")}
  </div></div>`;
}
function genreArt(k) {
  if (k === "war") return `<svg class="gi" viewBox="0 0 64 64" fill="none" stroke="#fff3d6" stroke-width="2"><path d="M14 50 46 18M46 18l4-8-8 4M20 44l-6 6M18 40l6 6"/><path d="M50 50 18 18M18 18l-4-8 8 4M44 44l6 6M46 40l-6 6"/></svg>`;
  if (k === "love") return `<svg class="gi" viewBox="0 0 64 64"><path d="M32 54S10 40 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 30-22 30z" fill="rgba(255,255,255,.22)" stroke="#fff" stroke-width="2"/></svg>`;
  return `<svg class="gi" viewBox="0 0 64 64" fill="none" stroke="#ffb3b8" stroke-width="2"><path d="M32 8c-12 0-20 9-20 21v27l6-5 5 5 5-5 4 5 4-5 5 5 5-5 6 5V29C52 17 44 8 32 8z"/><circle cx="25" cy="28" r="3" fill="#ff3b3b"/><circle cx="39" cy="28" r="3" fill="#ff3b3b"/></svg>`;
}

/* ---------- READER ---------- */
function catLabel(c) { return c.kind === "story" ? GENRES[c.key].name : FIELDS[c.key].name; }
function startText(kind, key, skipId) {
  const pool = inCat(kind, key, S.level);
  const label = kind === "story" ? GENRES[key].name : FIELDS[key].name;
  if (!pool.length) return toast(`No ${label} texts at ${S.level} yet`);
  const unread = pool.filter(t => !isRead(t) && t.id !== skipId);
  let t;
  if (unread.length) t = unread[Math.floor(Math.random() * unread.length)];
  else {
    const others = pool.filter(x => x.id !== skipId);
    t = (others.length ? others : pool)[Math.floor(Math.random() * (others.length || pool.length))];
    toast(`You've read every ${label} text at ${S.level}. Reading one again`);
  }
  S.cur = { kind, key, level: t.level, mood: kind === "story" ? key : "fact", id: t.id, title: t.title, paras: t.paras, gloss: t.gloss || {}, quiz: t.quiz, words: t.words, answers: [], timer: { start: 0, elapsed: 0, running: false, done: false }, recorded: false, status: "ready" };
  go("reader");
}
function savedForms() { const set = new Set(); Object.values(S.vocab).forEach(v => { set.add(slug(v.word)); (v.forms || []).forEach(f => set.add(slug(f))); }); return set; }
const norm = t => t.toLowerCase().replace(/’/g, "'").replace(/'s$/, "");
const isSaved = (t, set) => set.has(slug(norm(t)));
function glossFor(token, gloss) {
  const w = norm(token);
  if (gloss[w]) return gloss[w];
  for (const k in gloss) if (k.includes(" ") || k.includes("-")) continue; else if (k === w.replace(/(es|s|ed|ing|ly)$/, "")) return gloss[k];
  return null;
}
function tokenize(p, gloss, set) {
  // multi-word glossary entries are marked first, then single words
  const multi = Object.keys(gloss).filter(k => /[\s]/.test(k)).sort((a, b) => b.length - a.length);
  let parts = [{ t: p }];
  multi.forEach(m => {
    const re = new RegExp("(?<![A-Za-z])(" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z])", "i");
    parts = parts.flatMap(x => { if (x.m) return [x]; const out = []; let s = x.t, r; while ((r = re.exec(s))) { out.push({ t: s.slice(0, r.index) }, { t: r[1], m }); s = s.slice(r.index + r[1].length); } out.push({ t: s }); return out; });
  });
  return parts.map(x => x.m ? `<span class="w g${isSaved(x.t, set) ? " saved" : ""}" data-k="${esc(x.m)}">${esc(x.t)}</span>` :
    x.t.split(/([A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z])/).map((t, i) => i % 2 ? `<span class="w${glossFor(t, gloss) ? " g" : ""}${isSaved(t, set) ? " saved" : ""}">${esc(t)}</span>` : esc(t)).join("")).join("");
}
function renderReader() {
  const c = S.cur; if (!c) return go("home");
  setMood(c.mood);
  const t = c.timer, set = savedForms();
  app.innerHTML = `<div class="view"><div class="rbar glass"><button class="back" id="back" aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div class="meta"><b>${esc(catLabel(c))}</b> · ${c.level} · ${c.words} words</div>
    <div class="fsz"><button id="fsm" aria-label="Smaller text">A−</button><button id="fsp" aria-label="Larger text">A+</button></div></div>
    <article class="paper glass"><div class="kicker">${esc(c.kind === "story" ? GENRES[c.key].tag : "Non-fiction · " + FIELDS[c.key].name)}</div>
      <h1>${esc(c.title)}</h1><div class="sub">${c.words} words · about ${Math.max(1, Math.round(c.words / 180))} min at 180 WPM · underlined words have a Persian meaning</div>
      <div class="prose" id="prose">${c.paras.map(p => `<p>${tokenize(p, c.gloss, set)}</p>`).join("")}</div></article>
    ${t.done ? `<div class="wpm glass"><div><b>${fmt(t.elapsed)}</b><span>Time</span></div><div><b>${c.wpm}</b><span>Words / min</span></div><div><b>${speedNote(c.wpm)}</b><span>Pace</span></div></div>` : ""}
    ${quizHtml(c)}
    <div class="row"><button class="btn pri" id="again">Next ${esc(catLabel(c))} text</button><button class="btn ghost" id="home2">All topics</button></div>
  </div>${!t.done ? dockHtml() : ""}`;
  document.documentElement.style.setProperty("--fs", S.fs + "rem");
  bindReader();
}
const fmt = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const speedNote = w => w < 150 ? "Careful" : w < 230 ? "Steady" : w < 300 ? "Fluent" : "Fast";
function dockHtml() {
  const t = S.cur.timer;
  return `<div class="dock glass"><div class="clock"><span class="dot ${t.running ? "live" : ""}"></span><span id="clock">${fmt(curElapsed())}</span></div>
  ${t.running ? `<button class="btn ghost" id="tpause">Pause</button><button class="btn pri" id="tdone">Finished</button>` : `<button class="btn pri" id="tstart">${t.elapsed ? "Resume" : "Start reading"}</button>`}</div>`;
}
const curElapsed = () => { const t = S.cur.timer; return t.elapsed + (t.running ? Date.now() - t.start : 0); };
let tick = 0;
function bindReader() {
  const c = S.cur;
  $("#back").onclick = () => go("home");
  const setFs = d => { S.fs = Math.min(1.7, Math.max(.95, +(S.fs + d).toFixed(2))); LS.set("lr.fs", S.fs); document.documentElement.style.setProperty("--fs", S.fs + "rem"); };
  $("#fsm").onclick = () => setFs(-.08);
  $("#fsp").onclick = () => setFs(.08);
  $("#home2").onclick = () => go("home");
  $("#again").onclick = () => startText(c.kind, c.key, c.id);
  $("#tstart") && ($("#tstart").onclick = () => { c.timer.start = Date.now(); c.timer.running = true; renderReaderKeep(); });
  $("#tpause") && ($("#tpause").onclick = () => { c.timer.elapsed = curElapsed(); c.timer.running = false; renderReaderKeep(); });
  $("#tdone") && ($("#tdone").onclick = () => {
    c.timer.elapsed = curElapsed(); c.timer.running = false; c.timer.done = true;
    c.wpm = Math.round(c.words / Math.max(c.timer.elapsed / 60000, 0.1));
    record(); renderReaderKeep(); setTimeout(() => $("#quiz")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  });
  clearInterval(tick);
  if (c.timer.running) tick = setInterval(() => { const el = $("#clock"); if (el) el.textContent = fmt(curElapsed()); else clearInterval(tick); }, 500);
  $("#prose").onclick = e => { const w = e.target.closest(".w"); if (w) openWord(w); };
  app.querySelectorAll(".opt").forEach(b => b.onclick = () => answer(+b.dataset.q, +b.dataset.o));
}
function renderReaderKeep() { const y = scrollY; renderReader(); scrollTo(0, y); }
function quizHtml(c) {
  if (!c.quiz) return "";
  const L = "ABCD"; const done = c.answers.filter(a => a != null).length;
  const right = c.quiz.reduce((n, q, i) => n + (c.answers[i] === q.answer ? 1 : 0), 0);
  return `<div class="quiz glass" id="quiz"><h2>Comprehension · 4 questions</h2>
  ${c.quiz.map((q, i) => { const a = c.answers[i]; return `<div class="q"><div class="qt"><small>${i + 1} · ${esc(q.type || "Question")}</small>${esc(q.q)}</div>
    ${(q.options || []).map((o, j) => `<button class="opt ${a != null ? (j === q.answer ? "right" : j === a ? "wrong" : "") : ""}" data-q="${i}" data-o="${j}" ${a != null ? "disabled" : ""}><span class="k">${L[j]}</span><span>${esc(o)}</span></button>`).join("")}
    ${a != null ? `<div class="expl"><b style="color:${a === q.answer ? "var(--ok)" : "var(--bad)"}">${a === q.answer ? "Correct." : "Not quite. The answer is " + L[q.answer] + "."}</b> ${esc(q.explanation)}</div>` : ""}</div>`; }).join("")}
  ${done === c.quiz.length ? `<div class="score">You got ${right} of ${c.quiz.length} right</div>` : ""}</div>`;
}
function answer(i, o) { const c = S.cur; if (c.answers[i] != null) return; c.answers[i] = o; record(); renderReaderKeep(); }
function record() {
  const c = S.cur;
  const right = c.quiz ? c.quiz.reduce((n, q, i) => n + (c.answers[i] === q.answer ? 1 : 0), 0) : 0;
  const answered = c.answers.filter(a => a != null).length;
  if (!c.recorded) {
    S.prog.read++; c.recorded = { right: 0, answered: 0 }; S.prog.history.push({ id: Date.now() });
    if (!S.prog.readIds.includes(c.id)) S.prog.readIds.push(c.id);
  }
  S.prog.correct += right - c.recorded.right; S.prog.answered += answered - c.recorded.answered;
  c.recorded = { right, answered };
  const h = S.prog.history[S.prog.history.length - 1];
  Object.assign(h, { t: c.title, kind: c.kind === "story" ? c.key : "fact", cat: catLabel(c), level: c.level, words: c.words, wpm: c.wpm || h.wpm || 0, right, answered, date: new Date().toISOString().slice(0, 10) });
  S.prog.history = S.prog.history.slice(-200);
  saveProg();
}

/* ---------- word sheet ---------- */
function sentenceOf(el) {
  const p = el.parentElement.textContent; const w = el.textContent;
  let pos = 0, n = el; while ((n = n.previousSibling)) pos += n.textContent.length;
  const start = Math.max(p.lastIndexOf(". ", pos), p.lastIndexOf("? ", pos), p.lastIndexOf("! ", pos)) + 1;
  let end = p.slice(pos + w.length).search(/[.?!](\s|$)/); end = end < 0 ? p.length : pos + w.length + end + 1;
  return p.slice(start, end).trim();
}
let selEl = null;
function openWord(el) {
  selEl?.classList.remove("sel"); selEl = el; el.classList.add("sel");
  const token = el.textContent;
  const info = el.dataset.k ? S.cur.gloss[el.dataset.k] : glossFor(token, S.cur.gloss);
  const word = info?.w || norm(token);
  say(word);
  showSheet({ token, word, info, ctx: sentenceOf(el) });
}
function showSheet({ token, word, info, ctx }) {
  const sh = $("#sheet"), id = slug(word), saved = !!S.vocab[id];
  const tr = "https://translate.google.com/?sl=en&tl=fa&op=translate&text=" + encodeURIComponent(word);
  sh.innerHTML = `<div class="grab"></div>
  <div class="sw"><div style="flex:1;min-width:0"><h3>${esc(word)}</h3><div class="ipa">${info ? `<i>${esc(info.pos)}</i>${esc(info.ipa)}` : "American English"}</div></div>
  <button class="speak" id="spk" aria-label="Pronounce">${SPK}</button></div>
  ${info ? `<div class="fa">${esc(info.fa)}</div>
    <div class="ex"><div style="flex:1"><p>${esc(info.ex)}</p></div><button class="mini" id="spkx" aria-label="Play example">${SPK}</button></div>
    <div class="ctx"><small>In this text</small>${esc(ctx)}</div>`
    : `<p class="def" style="margin-top:12px">This word isn't in the word list for this text. Underlined words have a Persian meaning built in.</p>
    <a class="btn ghost" style="width:100%;margin-top:4px;text-decoration:none" href="${tr}">Look it up in Google Translate</a>`}
  <button class="btn ${saved ? "done" : "pri"}" id="saveW">${saved ? "Saved in Word Book ✓" : "Save to Word Book"}</button>`;
  sh.classList.add("on"); $("#scrim").classList.add("on");
  $("#spk").onclick = () => say(word);
  if (info) $("#spkx").onclick = () => say(info.ex, .95);
  $("#saveW").onclick = () => {
    if (S.vocab[id]) { delWord(id); toast("Removed from Word Book"); }
    else { saveWord({ id, word, pos: info?.pos || "", ipa: info?.ipa || "", fa: info?.fa || "", def: "", example: info?.ex || ctx, forms: [norm(token)], source: S.cur?.title || "", added: Date.now(), reviews: 0 }); toast("Saved to Word Book"); }
    showSheet({ token, word, info, ctx });
    const set = savedForms(); document.querySelectorAll("#prose .w").forEach(w => w.classList.toggle("saved", isSaved(w.textContent, set)));
  };
}
function closeSheet() { $("#sheet").classList.remove("on"); $("#scrim").classList.remove("on"); selEl?.classList.remove("sel"); selEl = null; }
$("#scrim").onclick = closeSheet;
window.lumenBack = () => {
  if ($("#sheet").classList.contains("on")) { closeSheet(); return true; }
  if (S.tab !== "home") { go("home"); return true; }
  return false;
};
let sy = null;
$("#sheet").addEventListener("touchstart", e => sy = e.touches[0].clientY, { passive: true });
$("#sheet").addEventListener("touchend", e => { if (sy != null && e.changedTouches[0].clientY - sy > 70) closeSheet(); sy = null; });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
