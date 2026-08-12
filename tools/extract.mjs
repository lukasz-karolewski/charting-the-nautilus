// Parses the F. P. Walter translation (Project Gutenberg #2488) into candidate
// waypoints: chapter boundaries, explicit dates, coordinate readings, league marks.
//
// Output is a CANDIDATE list, not the dataset. Coordinates in Verne carry two traps
// that no regex settles on its own:
//   1. axis order varies ("longitude 15 degrees 12' and latitude 45 degrees 37'")
//   2. the hemisphere is often absent, and defaulting it to positive silently puts
//      points in the wrong half of the world
// Both are resolved by hand against the prose in data/journey.json.
//
//   node tools/extract.mjs > data/candidates.json

import { readFileSync } from "node:fs";

const RAW = readFileSync(new URL("./source/pg2488.txt", import.meta.url), "utf8");
const LINES = RAW.split("\n");

// The file opens with a table of contents that repeats every chapter title; the body
// proper starts at the second "FIRST PART". Anchor on that or every chapter matches twice.
const partAnchors = [];
LINES.forEach((l, i) => {
  if (/^(FIRST|SECOND) PART\s*$/.test(l)) partAnchors.push({ line: i, label: l.trim() });
});
const bodyStart = partAnchors[partAnchors.length - 2].line;
const secondPartLine = partAnchors[partAnchors.length - 1].line;

// Chapters are "CHAPTER <n>", a blank line, then the title.
const chapters = [];
for (let i = bodyStart; i < LINES.length; i++) {
  const m = /^CHAPTER (\d+)\s*$/.exec(LINES[i]);
  if (!m) continue;
  let title = "";
  for (let j = i + 1; j < i + 5; j++) {
    if (LINES[j] && LINES[j].trim()) { title = LINES[j].trim(); break; }
  }
  chapters.push({
    part: i < secondPartLine ? 1 : 2,
    chapter: Number(m[1]),
    title,
    start: i,
  });
}
chapters.forEach((c, i) => {
  c.end = i + 1 < chapters.length ? chapters[i + 1].start - 1 : LINES.length - 1;
  c.ordinal = i + 1; // 1..47 across both parts - the only safe ordering key
});

const norm = (s) => s.replace(/\s+/g, " ").trim();
const context = (line, span = 2) =>
  norm(LINES.slice(Math.max(0, line - span), line + span + 1).join(" "));

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";

// "latitude 31 degrees 15' north" / "longitude 136 degrees 42' east", also the
// typographic "47° 24'" form used in a few headings.
const COORD = new RegExp(
  String.raw`(latitude|longitude)\s+(\d+)\s*(?:degrees|°)\s*(?:(\d+)\s*[′'])?\s*(north|south|east|west)?`,
  "gi"
);

for (const c of chapters) {
  const dates = [];
  const coords = [];
  const leagues = [];

  for (let i = c.start; i <= c.end; i++) {
    const line = LINES[i];
    if (!line) continue;

    for (const m of line.matchAll(new RegExp(String.raw`\b(${MONTHS})\s+(\d{1,2})\b`, "g"))) {
      dates.push({ month: m[1], day: Number(m[2]), line: i + 1, context: context(i) });
    }
    for (const m of line.matchAll(COORD)) {
      coords.push({
        axis: m[1].toLowerCase(),
        deg: Number(m[2]),
        min: m[3] ? Number(m[3]) : 0,
        // null means the text did not say - must be resolved by hand, never defaulted
        hemisphere: m[4] ? m[4].toLowerCase() : null,
        line: i + 1,
        context: context(i),
      });
    }
    for (const m of line.matchAll(/([\d,]{3,})\s+leagues/g)) {
      leagues.push({ value: Number(m[1].replace(/,/g, "")), line: i + 1, context: context(i) });
    }
  }

  c.dates = dates;
  c.coords = coords;
  c.leagues = leagues;
  c.lineRange = [c.start + 1, c.end + 1];
  delete c.start;
  delete c.end;
}

const counts = {
  chapters: chapters.length,
  part1: chapters.filter((c) => c.part === 1).length,
  part2: chapters.filter((c) => c.part === 2).length,
  dates: chapters.reduce((n, c) => n + c.dates.length, 0),
  coords: chapters.reduce((n, c) => n + c.coords.length, 0),
  coordsMissingHemisphere: chapters.reduce(
    (n, c) => n + c.coords.filter((x) => !x.hemisphere).length, 0),
  leagueMarks: chapters.reduce((n, c) => n + c.leagues.length, 0),
};

console.error(JSON.stringify(counts, null, 2));
console.log(JSON.stringify({ counts, chapters }, null, 2));
