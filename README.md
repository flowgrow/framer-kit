# Framer Kit

Native scroll-snap carousels and Kniff lightboxes for Framer.

The code files in the [Framer Kit Framer project](https://framer.com/projects/Framer-Kit--BqMZT7zRSjeufHHfMQHE-8MaFD) are the source of truth. This GitHub repository is a synchronized copy of those files for versioning, review, and browser testing — Framer's `Kit/` folder maps to [`src/`](./src).

## Scroll-snap carousel

Use a shared parent frame containing the viewport frame, its slides, and its controls. Set the viewport's width, max-width, padding, and gap directly in Framer. Percentage slide widths use that authored content area; no separate sizing frame is required. Enable **Full Bleed** (`fullBleed`, off by default) to extend the scrollable viewport to the page edges while keeping slides aligned with the authored padding.

On the Framer canvas, the carousel displays the authored layers. For preview and published pages:

1. Apply `withKniffContext` to the common parent of a carousel, its controls, and/or its lightbox gallery.
2. Apply `withKniffCarouselViewport` to the viewport frame (including when Loop is off) and place **Kniff Carousel Settings** inside the context.
3. Apply `withKniffCarouselPreviousButton`, `withKniffCarouselNextButton`, `withKniffCarouselPlayButton`, `withKniffCarouselProgress`, `withKniffCarouselDotsContainer`, and `withKniffCarouselDot` to your control layers.

`KniffCarouselSettings` configures alignment (`start`, `center`, `end`), `stopEach`, `edgeSpace`, `fullBleed`, `loop`, `slideBy`, and Auto Move (`off`, `per-slide`, or continuous `scroll`). Snapping is mandatory and scrollbars are hidden.

Loop is enabled by default in preview and published pages. React clones the slides and normalizes scroll position after `scrollend`, with Safari layer resets at loop jumps to prevent blank frames. With Loop off, scrolling and snapping remain native CSS.

### Grouped carousel navigation

**Carousel Settings → Slide By** selects Fixed or Auto:

- **Fixed** uses the Slides count (default `1`). Groups stay anchored to the first slide (e.g. with `3`, stops are slides 1–3, 4–6, etc., including an incomplete final group). Start, center, and end alignment apply to the whole group.
- **Auto** packs consecutive slides and gaps into the viewport width minus scroll-padding, with at least one slide per group. Resize and CMS insertions recalculate groups.

Arrows, dots, per-slide automove, and native snap areas share the same stops. Dots count reachable stops, merging clamped duplicates when Loop is off. Apply `withKniffCarouselIgnoreSlide` to a CMS loader so it does not count as a slide.

## Kniff Lightbox

Apply `withKniffContext` to the gallery parent, `withKniffLightboxTrigger` to each image, and place **Kniff Lightbox Settings** inside the parent.

The lightbox supports Peek or Theater layouts, neighbor preloading, zoom controls, captions, thumbnail previews, morph transitions, and pull-to-close. Inside a registered carousel, opening an image pauses automove until the close morph finishes, and navigating in the lightbox keeps the underlying carousel slide aligned (including on React loop copies).

## Testing and tooling

Tests run against the actual published Framer Kit project (`https://adaptable-squash-368743.framer.app`, override with `FRAMER_SITE_URL`), alongside focused unit tests for pure logic:

```sh
pnpm install --frozen-lockfile
pnpm test                 # Unit tests (authoredStyles, slideGroups)
pnpm test:framer          # Published Framer project checks in desktop & mobile WebKit
pnpm test:collector       # Parser unit tests + published Framer checks
pnpm run typecheck        # TypeScript check
```

The Playwright WebKit projects cover desktop and iPhone emulation, not the installed Safari app or the Framer editor canvas. Test routes include `/carousel/default`, `/carousel/edge-space-off`, `/carousel/loop-off`, `/carousel/group-loop-test`, and `/cms/default?slide-by=1` (also `2`, `3`, or `0` for Auto).

Native macOS browser scroll stress tests (requires Accessibility and screen capture permissions):

```sh
swift scripts/macos-wheel.swift --app safari --test --runs 40
```

Use `chrome` or `firefox` for other browsers.

## License

MIT. See [LICENSE](./LICENSE).
