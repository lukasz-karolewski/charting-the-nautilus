// Assembles index.html: simplifies the basemap, lifts quotes verbatim from the
// source text, joins chapter titles, computes day numbers, and inlines the lot
// into tools/template.html.
//
//   node tools/build.mjs
//
// Everything is inlined because the page must work from file:// - a local page
// cannot fetch() sibling JSON, so there is nothing to load at runtime.

import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

const LINES = read("tools/source/pg2488.txt").split("\n");
const { chapters } = JSON.parse(read("data/candidates.json"));
const { meta, waypoints } = JSON.parse(read("data/journey.json"));
const land = JSON.parse(read("data/land.raw.json"));

const norm = (s) => s.replace(/\s+/g, " ").trim();

// The source is hard-wrapped, so a line range almost always slices through the
// middle of a sentence. Widen the window, locate the requested lines inside it,
// then snap outward to the nearest sentence boundaries so the quote reads aloud.
const MAX_QUOTE = 420;
function quoteFor(a, b) {
  const core = norm(LINES.slice(a - 1, b).join(" "));
  const win = norm(LINES.slice(Math.max(0, a - 6), b + 6).join(" "));
  const at = win.indexOf(core);
  if (at < 0) return core; // shouldn't happen; degrade to the raw range

  // Walk left to just after the previous sentence terminator. If that boundary is
  // too far back to include, go the other way instead and drop the dangling part
  // sentence off the front, so a quote never opens mid-clause.
  let s = at;
  const left = win.slice(0, at);
  const mL = [...left.matchAll(/[.!?][”"']?\s+/g)].pop();
  if (mL && at - (mL.index + mL[0].length) < 200) {
    s = mL.index + mL[0].length;
  } else {
    const mIn = /[.!?][”"']?\s+/.exec(core);
    if (mIn && mIn.index < 160) s = at + mIn.index + mIn[0].length;
  }

  // walk right to the next sentence terminator
  let e = at + core.length;
  const mR = /[.!?][”"']?(\s|$)/.exec(win.slice(e));
  if (mR && mR.index < 200) e += mR.index + mR[0].trimEnd().length;

  let q = win.slice(s, e).trim();
  if (q.length > MAX_QUOTE) {
    // too long to read aloud comfortably - cut back to a sentence end
    const cut = q.lastIndexOf(". ", MAX_QUOTE);
    q = cut > 120 ? q.slice(0, cut + 1) : q.slice(0, MAX_QUOTE).trim() + "…";
  }
  return q;
}

// --- basemap ---------------------------------------------------------------
// Round to 2dp (about 1 km, far finer than a 720px-wide map can show), drop
// runs of duplicate points, and drop islands too small to read. Antarctica is
// kept - the voyage reaches the pole.
const MIN_SPAN = 1.2; // degrees; a ring smaller than this in both axes goes
function simplifyRing(ring) {
  const out = [];
  let prev = null;
  for (const [lon, lat] of ring) {
    const p = [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100];
    if (prev && p[0] === prev[0] && p[1] === prev[1]) continue;
    out.push(p);
    prev = p;
  }
  if (out.length < 4) return null;
  const lons = out.map((p) => p[0]), lats = out.map((p) => p[1]);
  const span = Math.max(...lons) - Math.min(...lons);
  const spanLat = Math.max(...lats) - Math.min(...lats);
  if (span < MIN_SPAN && spanLat < MIN_SPAN) return null;
  return out;
}

const rings = [];
for (const f of land.features) {
  const polys = f.geometry.type === "Polygon"
    ? [f.geometry.coordinates]
    : f.geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      const s = simplifyRing(ring);
      if (s) rings.push(s);
    }
  }
}

// --- waypoints -------------------------------------------------------------
const byOrdinal = new Map(chapters.map((c) => [c.ordinal, c]));
const DAY0 = new Date(meta.voyageStart + "T00:00:00Z");
const dayOf = (iso) =>
  Math.round((new Date(iso + "T00:00:00Z") - DAY0) / 86400000) + 1;

const points = waypoints.map((w) => {
  const c = byOrdinal.get(w.ordinal);
  const [a, b] = w.quoteLines;
  return {
    id: w.id,
    name: w.name,
    kidName: w.kidName,
    lat: w.lat,
    lon: w.lon,
    date: w.date,
    dateCertainty: w.dateCertainty,
    day: dayOf(w.date),
    ordinal: w.ordinal,
    part: w.part,
    chapter: w.chapter,
    chapterTitle: c.title,
    leg: w.leg,
    placeKind: w.placeKind,
    leagueMark: w.leagueMark ?? null,
    note: w.note ?? null,
    // verbatim from the book - never hand-typed, so it cannot drift
    quote: quoteFor(a, b),
    sourceLine: w.sourceLine,
  };
});

// Number the stops. Each leg counts from 1 again, and the numbering runs over
// every point of that leg rather than the visible ones, so a stop keeps the same
// number however far the reader has got.
const seen = {};
for (const p of points) {
  seen[p.leg] = (seen[p.leg] ?? 0) + 1;
  p.seq = seen[p.leg];
}
const legTotals = { ...seen };

// Prove every quote is verbatim rather than trusting the extractor: each must
// appear, whitespace-normalized, in the normalized source. A truncated quote is
// checked up to its ellipsis.
const FLAT = norm(LINES.join(" "));
const drifted = points.filter((p) => {
  const q = p.quote.replace(/…$/, "").trim();
  return !FLAT.includes(q);
});
if (drifted.length) {
  console.error("QUOTES NOT FOUND IN SOURCE:\n  " +
    drifted.map((p) => `${p.id}: ${p.quote.slice(0, 70)}`).join("\n  "));
  process.exit(1);
}

const chapterList = chapters.map((c) => ({
  ordinal: c.ordinal,
  part: c.part,
  chapter: c.chapter,
  title: c.title,
}));

const payload = {
  meta: { ...meta, generated: new Date().toISOString().slice(0, 10) },
  chapters: chapterList,
  legTotals,
  points,
  land: rings,
};

const html = read("tools/template.html").replace(
  "/*__DATA__*/",
  JSON.stringify(payload)
);
writeFileSync(new URL("index.html", root), html);

const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(`land rings   ${rings.length} (${kb(JSON.stringify(rings).length)})`);
console.log(`points       ${points.length}`);
console.log(`chapters     ${chapterList.length}`);
console.log(`index.html   ${kb(html.length)}`);
