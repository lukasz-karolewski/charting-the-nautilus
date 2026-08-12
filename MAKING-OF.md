# Making of

How the page is built, and what had to be settled by hand.

## Reading the positions out of the text

Verne sometimes writes **longitude before latitude** ("in longitude 15 degrees 12′ and latitude
45 degrees 37′"), and **49 of the 71 coordinate readings give no N/S/E/W at all**. Every one of
those was resolved by hand against the surrounding narrative; where a hemisphere was inferred,
the point's note says so. None was defaulted to positive.

Not every coordinate in the book is the narrator's position, either — chapter 1's readings are
*other ships'* sighting reports, and the South Pole chapter recites a history of Antarctic
exploration. Those are kept off the route line.

## Rebuilding

```bash
node tools/extract.mjs > data/candidates.json   # text  -> candidate readings
node tools/verify.mjs                           # check the curated data
node tools/build.mjs                            # -> index.html
```

- `data/journey.json` — the curated waypoints. **This is the real content.** Coordinates,
  dates, chapters and notes, each adjudicated against the prose.
- `tools/extract.mjs` — parses the 47 chapters and pulls out dates, coordinates and league
  marks as *candidates*. Its output is never used directly.
- `tools/verify.mjs` — the guard rails (see below).
- `tools/build.mjs` — simplifies the basemap, lifts the quotes, inlines everything into `index.html`.

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
5. Antimeridian crossings are counted — there are three. These are why the map unwraps
   longitudes (running them on past 180 so each leg is one continuous line) instead of
   plotting them raw, which would snap the route back across the whole world.
6. Coordinates in range, legs and place kinds valid.

Basemap: Natural Earth 110m land, simplified to 115 rings.
