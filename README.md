# The Voyage of the *Nautilus*

An interactive map of the journey in *Twenty Thousand Leagues Under the Sea*, built for
reading the book aloud a chapter at a time.

## ▶ [Open the map](https://lukasz-karolewski.github.io/charting-the-nautilus/)

## Using it

- Set **"We've read up to"** to the chapter you just finished. Everything past it stays hidden,
  so nothing is spoiled. Arrow keys step it, and it remembers where you got to.
- Click a chapter in the list, or any point on the map, for the date, the day aboard, what
  happens there, and **a passage from the book to read aloud**.
- Places in the chapter you are on are picked out in **orange**. Every dot is numbered,
  counting from 1 again on each of the three tracks.
- The checkboxes hide and show each track. Drag to pan — the map wraps round, so the Pacific
  crossing runs straight through the dateline — and scroll to zoom.

## What is on the map

75 stops on three tracks:

| | |
|---|---|
| **Early sightings** (violet) | Chapter 1. *Other ships'* reports of the "monster", 1866–67. Not the narrator's position, so they are not joined by a line. |
| **The chase** (blue, dashed) | The frigate *Abraham Lincoln*, Brooklyn → Cape Horn → Japan, June–November 1867. |
| **The *Nautilus*** (gold) | 8 November 1867 – June 1868. The voyage itself. |

Places Verne invented — Crespo Island, Atlantis, the Arabian Tunnel, the coal mine inside the
volcano, the open sea at the South Pole — are drawn as **dashed rings** and labelled "invented
place", because children ask.

Every position comes out of the book, including the leagues counter, which uses Verne's own
running tally rather than a sum of distances between points.

## Source text

The map is built from Project Gutenberg #2488, the F. P. Walter translation. The 1873 Mercier
Lewis translation — the one you tend to find first — is an abridgement that drops about a
quarter of the book, and much of what it drops is numbers:

| edition | words | coordinate readings | dated entries |
|---|---|---|---|
| #164 Mercier Lewis | 107,726 | 64 | 96 |
| #2488 F. P. Walter | 147,036 | 122 | 149 |

## Where Verne contradicts himself

- **Day one.** Nemo puts them at "137° 15′ **west** of the meridian of Paris" and, in the same
  breath, "about 300 miles from the shores of Japan". Those cannot both be true — the numbers
  only work as *east*.
- **Cape Wessel** is placed at "latitude 10 degrees **north**". It is 11 degrees *south*, at the
  top of the Gulf of Carpentaria.
- **The Laccadives** lie "between longitude 50 degrees **72′** and 69 degrees east". There are
  only 60 minutes in a degree.
- **The length of the voyage.** Aronnax counts 20,000 leagues "in less than ten months"; the
  dates in the book run from 8 November to early June — about seven.
- **Vanikoro** is put at 16° 4′ S. The real island is at about 11° 40′ S.

Where the book disagrees with itself the map follows the text and says so in the point's note,
rather than quietly correcting him.

**[MAKING-OF.md](MAKING-OF.md)** covers how the page is built and how to rebuild it.

## Credits and licence

- **The text** is *Twenty Thousand Leagues Under the Seas*, translated by F. P. Walter, from
  [Project Gutenberg #2488](https://www.gutenberg.org/ebooks/2488). Verne's original is long
  out of copyright and Walter placed his translation in the public domain.
  `tools/source/pg2488.txt` is the unmodified Gutenberg file, licence header and all, which is
  what the Project Gutenberg Licence asks for. "Project Gutenberg" is a registered trademark of
  the Project Gutenberg Literary Archive Foundation; this project is not affiliated with them.
- **The basemap** is [Natural Earth](https://www.naturalearthdata.com/) 110m land — public
  domain.
- **Everything else** — the curated waypoints in `data/journey.json`, the tools and the page —
  is MIT licensed. See [LICENSE](LICENSE).
