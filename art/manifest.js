// Artworks shown in the "Artworks" switcher, plus the book card at completion.
//
// To add a new artwork:
//   1. Export two SVGs from Illustrator into art/<id>/ :
//        image.svg — the finished spiroglyphic as ONE filled path (the
//                    variable-width spiral shape, fill only, no strokes)
//        line.svg  — the same spiral as ONE plain centreline path
//                    (fill:none, stroked) — this is the path the pen follows
//      Both files must share the same artboard/viewBox so they register.
//      Only have image.svg? Generate the centreline from it:
//        node tools/derive-centreline.js art/<id>/image.svg art/<id>/line.svg
//   2. Add an entry below (order here = order in the switcher).
//   3. Drop the book cover image into covers/ — `cover` is optional; a lettered
//      tile is shown while the image file is missing. `buy` (optional) adds a
//      "Get the book" link to the completion card.
//
// Optional per-artwork overrides:
//   pen: 15           — pen-nib width in viewBox units (how wide a band the
//                       scroll-draw reveals). Bump it up if slivers of grey
//                       guide remain beside the drawn line.
//   credit: "..."     — HUD credit line (defaults to "Spiroglyphics · by Thomas Pavitte").

window.SPIRO_MANIFEST = [
  {
    id: "elvis",
    title: "Elvis",
    book: "Spiroglyphics",
    cover: "covers/spiroglyphics.jpg",
    buy: ""
  },
  {
    id: "snape",
    title: "Snape",
    book: "Harry Potter Spiroglyphics",
    cover: "covers/harry-potter-spiroglyphics.jpg",
    credit: "Harry Potter Spiroglyphics · by Thomas Pavitte",
    pen: 10,
    buy: ""
  }
];
