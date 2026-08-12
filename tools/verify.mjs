// Checks data/journey.json against the source text and against physics.
//   node tools/verify.mjs
// Exits non-zero if any check fails.

import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const RAW = readFileSync(new URL("tools/source/pg2488.txt", root), "utf8");
const LINES = RAW.split("\n");
const { chapters } = JSON.parse(readFileSync(new URL("data/candidates.json", root), "utf8"));
const { meta, waypoints } = JSON.parse(readFileSync(new URL("data/journey.json", root), "utf8"));

const fail = [];
const warn = [];
const err = (m) => fail.push(m);

const norm = (s) => s.replace(/\s+/g, " ").trim();
const byOrdinal = new Map(chapters.map((c) => [c.ordinal, c]));

// 1. chapter integrity -------------------------------------------------------
if (chapters.length !== 47) err(`expected 47 chapters, parsed ${chapters.length}`);
if (chapters.filter((c) => c.part === 1).length !== 24) err("part 1 should have 24 chapters");
if (chapters.filter((c) => c.part === 2).length !== 23) err("part 2 should have 23 chapters");

// ordinals contiguous 1..47 and (part, chapter) strictly increasing with ordinal.
// This is the check that catches the part-1/part-2 chapter-number collision;
// a check on `chapter` alone passes straight through it.
let prevKey = -1;
for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  if (c.ordinal !== i + 1) err(`ordinal not contiguous at index ${i}: got ${c.ordinal}`);
  const key = c.part * 1000 + c.chapter;
  if (key <= prevKey) err(`(part,chapter) not increasing at ordinal ${c.ordinal}`);
  prevKey = key;
}

for (const w of waypoints) {
  const c = byOrdinal.get(w.ordinal);
  if (!c) { err(`${w.id}: ordinal ${w.ordinal} has no chapter`); continue; }
  if (c.part !== w.part || c.chapter !== w.chapter)
    err(`${w.id}: says P${w.part}C${w.chapter} but ordinal ${w.ordinal} is P${c.part}C${c.chapter}`);

  // 2. source fidelity: quote lines must sit inside the chapter's line range,
  //    and the extracted text must be non-empty.
  const [qa, qb] = w.quoteLines;
  const [ra, rb] = c.lineRange;
  if (qa < ra || qb > rb)
    err(`${w.id}: quoteLines ${qa}-${qb} fall outside chapter ${w.ordinal} range ${ra}-${rb}`);
  if (!norm(LINES.slice(qa - 1, qb).join(" ")))
    err(`${w.id}: quoteLines ${qa}-${qb} extract to empty text`);

  // Explicit dates must actually appear in the chapter. Verne sometimes writes the
  // date relatively ("the 27th of the same month") or uppercased at a chapter
  // opening ("ON JANUARY 28"), so dateText carries the literal form when it differs
  // and the comparison is case-insensitive.
  if (w.dateCertainty === "explicit") {
    const d = new Date(w.date + "T00:00:00Z");
    const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
    const needle = (w.dateText ?? `${month} ${d.getUTCDate()}`).toLowerCase();
    const hay = norm(LINES.slice(ra - 1, rb).join(" ")).toLowerCase();
    if (!hay.includes(needle))
      err(`${w.id}: date "${needle}" marked explicit but not found in chapter ${w.ordinal}`);
  }

  // 6. bounds
  if (!(w.lat >= -90 && w.lat <= 90)) err(`${w.id}: lat ${w.lat} out of range`);
  if (!(w.lon >= -180 && w.lon <= 180)) err(`${w.id}: lon ${w.lon} out of range`);
  if (!["sighting", "abraham_lincoln", "nautilus"].includes(w.leg)) err(`${w.id}: bad leg`);
  if (!["real", "fictional"].includes(w.placeKind)) err(`${w.id}: bad placeKind`);
}

// 3. monotonic time, per leg -------------------------------------------------
for (const leg of ["abraham_lincoln", "nautilus"]) {
  const pts = waypoints.filter((w) => w.leg === leg);
  for (let i = 1; i < pts.length; i++) {
    if (new Date(pts[i].date) < new Date(pts[i - 1].date))
      err(`${leg}: time runs backwards, ${pts[i - 1].id} -> ${pts[i].id}`);
  }
}

// league marks must also only ever increase
const marks = waypoints.filter((w) => w.leagueMark != null);
for (let i = 1; i < marks.length; i++) {
  if (marks[i].leagueMark < marks[i - 1].leagueMark)
    err(`league tally goes backwards: ${marks[i - 1].id} -> ${marks[i].id}`);
}

// 4. implied speed -----------------------------------------------------------
// The Nautilus tops out near 50 knots, so ~1400 nm/day is the ceiling. Anything
// faster is a wrong hemisphere, a bad coordinate, or a mis-dated gap.
const R_NM = 3440.065;
const hav = (a, b) => {
  const toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  let dLon = Math.abs(b.lon - a.lon);
  if (dLon > 180) dLon = 360 - dLon; // shortest way round, not across the map
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(toR(dLon) / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.sqrt(h));
};

// Both travelling legs are checked. The chase carries three hand-adjudicated
// bare-longitude fixes of its own, so restricting this to the Nautilus would
// leave exactly the points most likely to be wrong unexamined.
const nautilus = waypoints.filter((w) => w.leg === "nautilus");
const crossings = [];
let totalNm = 0;

for (const leg of ["abraham_lincoln", "nautilus"]) {
  const pts = waypoints.filter((w) => w.leg === leg);
  // a sailing frigate cannot do what the Nautilus can
  const ceiling = leg === "nautilus" ? 1400 : 400;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const nm = hav(a, b);
    if (leg === "nautilus") totalNm += nm;

    const days = Math.max((new Date(b.date) - new Date(a.date)) / 86400000, 0.5);
    const rate = nm / days;
    if (rate > ceiling)
      warn(`fast leg (${leg}) ${a.id} -> ${b.id}: ${Math.round(nm)} nm in ${days}d = ${Math.round(rate)} nm/day`);

    // 5. antimeridian: not an error, but these are why the map has to unwrap
    //    longitudes rather than plot them raw - drawn as-is the line would snap
    //    back across the whole world instead of continuing through the dateline.
    if (Math.abs(b.lon - a.lon) > 180) crossings.push(`${a.id} -> ${b.id}`);
  }
}

// report ---------------------------------------------------------------------
const days = Math.round(
  (new Date(nautilus.at(-1).date) - new Date(meta.voyageStart)) / 86400000);
console.log(`waypoints        ${waypoints.length}`);
console.log(`  sightings      ${waypoints.filter((w) => w.leg === "sighting").length}`);
console.log(`  abraham lincoln${String(waypoints.filter((w) => w.leg === "abraham_lincoln").length).padStart(2)}`);
console.log(`  nautilus       ${nautilus.length}`);
console.log(`fictional places ${waypoints.filter((w) => w.placeKind === "fictional").length}`);
console.log(`inferred dates   ${waypoints.filter((w) => w.dateCertainty === "inferred").length}`);
console.log(`voyage length    ${days} days (${meta.voyageStart} -> ${nautilus.at(-1).date})`);
console.log(`plotted track    ${Math.round(totalNm).toLocaleString()} nm between known points`);
console.log(`dateline crossings ${crossings.length}${crossings.length ? ": " + crossings.join(", ") : ""}`);
if (warn.length) console.log("\nwarnings:\n  " + warn.join("\n  "));
if (fail.length) {
  console.error(`\nFAILED ${fail.length}:\n  ` + fail.join("\n  "));
  process.exit(1);
}
console.log("\nall checks passed");
