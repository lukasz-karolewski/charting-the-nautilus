# The Voyage of the *Nautilus*

An interactive map of the journey in *Twenty Thousand Leagues Under the Sea*, built for
reading the book aloud a chapter at a time.

**Open `voyage.html`.** Double-click it. That is the whole thing — one self-contained file,
no server, no internet, no build step. It works offline.

## Using it while you read

- Set **"We've read up to"** to the chapter you just finished. Everything after that stays
  hidden, so the map never spoils what is coming. Arrow keys step it too.
- **Click any chapter in the left-hand list** to jump straight there — it moves the reading
  position exactly like the slider, opens that chapter's place, and if you are zoomed in it
  brings the map across to it. Chapters you have not reached are dimmed but still clickable,
  so you can skip ahead deliberately.
- The gate remembers where you were, so tomorrow night it is still on the right chapter.
- Click any point for the date, the day number aboard, the position, what happens there, and
  **a short passage from the book to read aloud**.
- The chapter list shows all 47. A filled dot means Verne gives a position in that chapter;
  a hollow dot means he doesn't — usually because they are deep inside the *Nautilus*.
- **The four legend checkboxes turn each track on and off** — hide the early sightings and the
  chase to leave just the *Nautilus*, or hide the invented places. The choice is remembered,
  and the day and league counters keep showing your true progress whatever is hidden.
- **Show whole voyage** turns the gate off, for when you have finished the book.
- **Replay** animates the voyage up to where you have read.
- Drag to pan, scroll to zoom — useful in the crowded bits like the Torres Strait.

## What is on the map

75 points on three tracks:

| | |
|---|---|
| **Early sightings** (violet) | Chapter 1. *Other ships'* reports of the "monster", 1866–67. Not the narrator's position, so they are not joined by a line. |
| **The chase** (blue, dashed) | The frigate *Abraham Lincoln*, Brooklyn → Cape Horn → Japan, June–November 1867. |
| **The *Nautilus*** (gold) | 8 November 1867 – June 1868. The voyage itself. |

Places Verne invented — Crespo Island, Atlantis, the Arabian Tunnel, the coal mine inside the
volcano, the open sea at the South Pole — are drawn as **dashed rings** and labelled "invented
place", because children ask.

The leagues counter uses **Verne's own running tally** (4,860 … 5,250 … 13,000 … 20,000), not a
sum of distances between points, so it matches the book and reaches 20,000 at the end.

## Source text

Project Gutenberg **#2488, the F. P. Walter translation**. This matters. The edition usually
found first, #164 (Mercier Lewis, 1873), is an abridgement that drops about a quarter of the
book and is notorious for garbling numbers — which is exactly what this map is made of:

| edition | words | coordinate readings | dated entries |
|---|---|---|---|
| #164 Mercier Lewis | 107,726 | 64 | 96 |
| **#2488 F. P. Walter** | **147,036** | **122** | **149** |

## Where Verne contradicts himself

The rule here is to follow the text and flag the problem in the point's note, never to quietly
correct him. The notable ones:

- **Day one.** Nemo gives the position as "137° 15′ **west** of the meridian of Paris" and in the
  same breath says "about 300 miles from the shores of Japan". Those cannot both be true. The
  numbers work as *east*; the point is drawn where the story says they are.
- **Cape Wessel** is placed at "latitude 10 degrees **north**". It is 11 degrees *south*, at the
  top of the Gulf of Carpentaria. The place name is unambiguous, so the real cape is used.
- **The Laccadives** are put "between longitude 50 degrees **72′** and 69 degrees east". There
  are only 60 minutes in a degree.
- **The length of the voyage.** Aronnax says 20,000 leagues "in less than ten months", but the
  dates in the book run from 8 November to early June — about seven.

Two other traps, handled during extraction rather than by regex: Verne sometimes writes
**longitude before latitude** ("in longitude 15 degrees 12′ and latitude 45 degrees 37′"), and
**49 of the 71 coordinate readings give no N/S/E/W at all**. Every one of those was resolved by
hand against the surrounding narrative; where a hemisphere was inferred, the point's note says
so. None was defaulted to positive.

## Rebuilding

```bash
node tools/extract.mjs > data/candidates.json   # text  -> candidate readings
node tools/verify.mjs                           # check the curated data
node tools/build.mjs                            # -> voyage.html
```

- `data/journey.json` — the curated waypoints. **This is the real content.** Coordinates,
  dates, chapters and notes, each adjudicated against the prose.
- `tools/extract.mjs` — parses the 47 chapters and pulls out dates, coordinates and league
  marks as *candidates*. Its output is never used directly.
- `tools/verify.mjs` — the guard rails (see below).
- `tools/build.mjs` — simplifies the basemap, lifts the quotes, inlines everything.

Quotes are **not stored** in `journey.json`. Each waypoint holds a line range, and the build
lifts the text out of the source and then asserts the result appears verbatim in the book, so a
quote cannot drift from what Verne wrote.

### What `verify.mjs` checks

1. 47 chapters, 24 + 23 — and that `ordinal` (1–47) is contiguous and strictly increasing.
   Both parts restart at chapter 1, so `chapter` alone has no total ordering; ordering on it
   would sort Part 2 ch. 3 ahead of Part 1 ch. 20.
2. Every quote range sits inside its chapter, and every date marked *explicit* really appears
   in that chapter (comparison is whitespace-normalised and case-insensitive, because the
   source is hard-wrapped and Verne uppercases dates at chapter openings).
3. Time never runs backwards, and the league tally never decreases.
4. **Implied speed.** The *Nautilus* tops out near 50 knots, so any leg over ~1,400 nm/day is
   reported. This is the check that catches a wrong hemisphere.
5. Antimeridian crossings are counted, so the renderer is known to need the split. There are
   two; without splitting them the route would snap back across the whole map.
6. Coordinates in range, legs and place kinds valid.

Basemap: Natural Earth 110m land, simplified to 115 rings.
