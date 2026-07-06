# Spiroglyphics — interactive

A single-page scrollytelling toy for the **Spiroglyphics** book by Thomas
Pavitte. Each artwork is one continuous spiral drawn with a varying line
width; scroll and the pen inks the spiral from the outside in, until the
portrait resolves.

**Live:** https://thomaspavitte-beep.github.io/spiroglyphics-interactive/

Part of the same family as the [Querkles](https://thomaspavitte-beep.github.io/querkles-interactive/),
[Chromatrix](https://thomaspavitte-beep.github.io/chromatrix-interactive/) and
1000 Dot-to-Dot demos — same chrome, same book-showcase mechanics, only the
middle activity changes.

## How it works

- **Scroll to draw.** A faint printed guide of the whole spiral sits on the
  page (like a page from the book). Scrolling reveals the inked line along the
  spiral's centreline. At the end the guide fades, leaving only the drawing.
- **From a distance.** A small live mirror of the artwork sits bottom-left —
  the harsh line work melts into a face at small size. Click it to enlarge.
  At the finish the finished piece scales down to that distance size.
- **Two colours.** Open **Colours** to set the line and the background. A fresh
  pair is chosen on every load (always a light page, dark line); **Shuffle
  colours** picks a new one. If you hand-pick a dark background the whole UI
  flips to dark mode.
- **Hide guide** toggles the printed grey spiral.

## Structure

```
index.html          the whole app — vanilla HTML, inline CSS + JS, no build step
art/
  manifest.js       the list of artworks (window.SPIRO_MANIFEST)
  <id>/
    image.svg       the finished spiroglyphic as ONE filled path
    line.svg        the same spiral as ONE stroked centreline path
covers/             book cover images (optional; a lettered tile shows if missing)
```

Nothing is inlined — adding an artwork is just adding files plus a manifest
entry, no code edits.

## Adding an artwork

1. From Illustrator, export **two** SVGs into `art/<id>/` (lowercase id,
   `a–z 0–9 -`):
   - `image.svg` — the finished spiroglyphic as **one filled path** (the
     variable-width spiral shape; fill only, no strokes).
   - `line.svg` — the **same spiral as one plain centreline path**
     (`fill:none`, stroked). This is the path the pen follows.

   Both files must share the same artboard / `viewBox` so they line up.
2. Add an entry to `art/manifest.js` (order there = order in the switcher):

   ```js
   { id: "elvis", title: "Elvis", book: "Spiroglyphics",
     cover: "covers/spiroglyphics.jpg", buy: "" }
   ```

   `cover` and `buy` are optional. Optional per-artwork overrides:
   `pen` (nib width in viewBox units — bump it up if slivers of guide show
   beside the drawn line) and `credit` (HUD credit line).
3. Drop the book cover into `covers/`. Portrait, ~200×270px JPG/PNG. Until the
   file exists a lettered tile is shown, so missing covers never break the page.

Switch artworks in the browser with `?art=<id>`.

## Running locally

The page loads its art files with `fetch()`, so it must be served over HTTP —
opening `index.html` from disk (`file://`) will show "Needs a local server".
Any static server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

GitHub Pages, `main` branch root. Pushing to `main` redeploys automatically
(usually within a minute or two).
