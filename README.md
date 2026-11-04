# @kniff/framer-kit

CSS scroll-snap carousel and Ramka lightbox integrations for Framer. The package
keeps Framer code files small while centralizing the browser implementation.

## Principles

- No browser or DOM access during module evaluation or initial SSR rendering.
- React, React DOM, and Framer are supplied by the host.
- Public browser code contains no credentials or server-side secrets.
- User-visible changes ship with a Changeset.

## Local development

```bash
pnpm install
pnpm run check
pnpm run dev:framer
```

The last command runs the build watcher, local server, and named Cloudflare
Tunnel at `https://framer-kit-dev.kniff.at`. Copy-ready Framer files are in
[`examples/framer`](./examples/framer). Use the same cache-busting query on
all imports when testing a local change, so the files load one module instance.
The development bundle prints `[Framer Kit local source]` in the browser console
when Framer loads an import with `?dev`. The production build removes these logs.

## CSS scroll-snap overflow

The `@kniff/framer-kit/scroll-snap` entry exports
`VisibleScrollOverflowSettings`, `CSSScrollSnapButton`, and the experimental
`InitialTarget` helper.
Native CSS handles scrolling and snapping while preserving Framer’s authored
padding, scroll padding, and gap. JavaScript calculates arrow destinations and optionally
repositions cloned slides for looping.

Use this native layer structure (the wrapper is optional):

```text
Full-width boundary Frame
  Optional padding or layout Frame
    Scroll viewport Frame
      Slide Frames
  VisibleScrollOverflowSettings
```

Set **Boundary** and **Viewport** on the settings component to the matching
layer names (or aria-labels). **Viewport** names the scrollable Frame itself;
its parent needs no special name or structure. Use distinct viewport names for
separate carousels. Slides keep
their percentage and pixel widths. Framer controls the viewport height:
Auto follows its content; a fixed viewport height supports Fill-height slides.

Settings include Loop (on by default), start/center/end snap alignment, mandatory/proximity snapping,
Stop Each Slide (off by default),
and Edge Space (on by default). Edge Space adds 50% at both ends for center,
100% at the end for start, and 100% at the start for end alignment.

**Auto Move** is a Select with **Off**, **Per Slide**, and **Scroll**. Per Slide
advances one native snap point after the configured pause (8 seconds by default).
Scroll moves continuously. The selected runtime loads only outside the canvas.

For Scroll, **Speed** is in pixels per second
(default 30); **Direction** chooses left or right. It pauses for horizontal touch gestures,
horizontal wheel input, keyboard and arrow navigation, settles to the nearest configured snap point,
and resumes after a 300ms hold. Loop wraps during movement; without Loop, movement
stops at the edge. Auto Move is off by default, disabled on canvas, and respects
reduced-motion preferences, background-tab visibility, and viewport visibility.
It stays paused offscreen (including clipping by scrollable ancestors) and resumes
from its paused position when visible, without accumulating missed movement.

Touch input waits for horizontal intent before interrupting Auto Move. Pending and
vertical gestures leave automatic motion running, so page scrolling never triggers
a carousel snap. Horizontal touch scrolling keeps
native snapping and momentum; the first actual horizontal scroll restores snapping.
Vertical wheel input also leaves automatic motion running. Auto Move’s own scroll
events are ignored. Mouse dragging
is not implemented. Once scrolling settles at a snap point, Auto Move waits 300ms
before restarting.

Looping is enabled by default in preview and published pages. On Safari versions
without `scrollend`, a 180ms scroll idle fallback repositions after momentum and
snapping settle, once the finger is lifted. Responsive `.ssr-variant` wrappers are
handled by applying snap styles and measuring the visible slide boxes.
Canvas alignment respects Edge Space and the selected alignment.

For arrows, add `CSSScrollSnapButton` and set **ID**
to the viewport Frame’s name. Choose Prev or Next and connect a button slot if desired.
Repeated clicks during animation advance the pending destination for every click.
Slotted buttons retain hover/pressed states, text selection is disabled, and the
existing inactive-opacity control applies when no further snap point is reachable
with Loop off.

Copy-ready development wrappers:
[`VisibleScrollOverflowSettings.tsx`](./examples/framer/VisibleScrollOverflowSettings.tsx),
[`CSSScrollSnapButton.tsx`](./examples/framer/CSSScrollSnapButton.tsx),
and [`initialTarget.tsx`](./examples/framer/initialTarget.tsx).
They load `https://framer-kit-dev.kniff.at/scroll-snap.js?dev`; keep the development
tunnel running. The package entry is available from source and the local build.

To try an initial target, place one `InitialTarget` inside the desired slide,
set Position to Absolute, and pin all four edges. It inherits the configured
snap alignment and uses [Roma Komarov's temporary container-query snap
technique](https://blog.kizu.dev/snappy-scroll-start/). This helper is
experimental: the current Framer Preview test did not reliably start on the
chosen slide. Packaging it does not change or resolve that behavior.

## Ramka lightboxes

Ramka uses parent containment to decide which images belong to one lightbox:

1. Apply `withRamkaGallery` to an outer Framer Frame.
2. Apply `withRamkaTrigger` to the image/card descendants that should open.
3. Optionally place `RamkaSettings` inside that outer Frame, as a sibling of
   the gallery or carousel, to configure the nearest parent gallery.

The trigger layers remain ordinary editable Framer layers. In Preview and on
the published site, the parent discovers their rendered image sources and
builds the fullscreen Ramka viewer. The canvas renders the original layers
unchanged. Multiple parent galleries remain independent without matching IDs.

The carousel always freezes at its current position before Ramka opens and stays
paused until the closing morph finishes. Opening a clicked image never snaps it.
Enable **Sync Kniff Carousel** to align the corresponding physical slide only
when navigating to a different image in the lightbox. It uses the same start,
center, or end snap coordinates as the carousel arrows.

The viewer uses Ramka’s default preset: aspect-sized Peek slides with neighboring
images, a Theater toggle, glass zoom controls, captions, and a desktop thumbnail
strip. Mobile uses full-width slides and a counter. The default backdrop is
white; custom backdrop colors remain configurable.

Copy-ready thin files live at
[`examples/framer/RamkaOverride.tsx`](./examples/framer/RamkaOverride.tsx) and
[`examples/framer/RamkaSettings.tsx`](./examples/framer/RamkaSettings.tsx).
Use the same cache-busting query on both remote imports during local testing.
Production-ready copies using the published package live in
[`examples/framer/production`](./examples/framer/production).

## Package areas

- `@kniff/framer-kit/scroll-snap` — native carousel settings, controls, and loop override.
- `@kniff/framer-kit/ramka` — lightbox gallery and trigger overrides.
- `@kniff/framer-kit` — root export of both areas.

## Verification

Run `pnpm run check` for types, unit tests, and the build. Run
`pnpm exec playwright install chromium firefox webkit` once, then
`pnpm run test:e2e` for browser coverage. The browser suite exercises native
navigation, looping, automatic movement, and Ramka integration. Failed runs
retain screenshots and traces in `test-results/`.

## Production releases

Every production push increments the package release version. Tag the release,
record it in `worker/releases.json`, and deploy the local build with
`pnpm run worker:deploy`. Production Framer imports pin a semantic release URL.
Preserve historical release and build URLs for existing consumers.

## License

Released under the [MIT License](./LICENSE).

### React-rendered loop copies

Looping requires `withKniffCarousel` on the actual overflow viewport, alongside
`VisibleScrollOverflowSettings` on the page. Settings control Loop and Auto Move.
The override renders copies with `React.cloneElement`; it does not copy DOM nodes
or forward clicks to the original slide.

For a looping Ramka gallery, apply `withKniffCarouselRamka` from
[`examples/framer/KniffCarouselOverride.tsx`](./examples/framer/KniffCarouselOverride.tsx)
to the viewport in place of `withRamkaGallery`. Keep `withRamkaTrigger` on the
photo layers and Ramka Settings inside the viewport. Each repeated set has its
own Ramka scope, so open and close morphs use the selected physical copy and the
viewer still contains one logical set of images. Copies stay mounted while the
lightbox is open and until the closing morph finishes.
