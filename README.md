# @kniff/framer-kit

The code files in the Framer Kit Framer project are the source of truth. This
GitHub repository is a local copy of those files for versioning; changes made
in Framer are synced here and committed to Git.
Framer's `Kit/` folder maps to this repository's `src/` folder. Framer's
`Framer_Kit/` wrapper files are copied into `Framer_Kit/` here.

Native scroll-snap carousels and Kniff lightboxes for Framer. React, React DOM,
and Framer are supplied by the host; implementations are safe to import during SSR.

## Scroll-snap carousel

Use a full-width boundary containing the viewport frame and its slides. Set the
viewport’s width, max-width, padding and gap in Framer. Percentage slide widths
use that authored content area; no separate sizing frame is required. An optional
padding wrapper is respected at each breakpoint. The component adds full-width
bleed gutters to your authored padding without layout measurements.

`VisibleScrollOverflowSettings` accepts `containerID`, `boundaryID`, `align`
(`start`, `center`, `end`), `stopEach`, `edgeSpace`,
and `loop`. Snapping is always mandatory and scrollbars are always hidden. Targets match an aria-label or custom Framer layer name.

Auto Move selects `off`, `per-slide` (advances on `autoMoveInterval`, in seconds),
or `scroll` (continuous motion at `autoMoveSpeed`, in px/s). Direction applies to
both motion modes.

Apply the `withKniffCarousel` override to the viewport frame, including when Loop
is off. It mirrors the viewport's authored padding, gap and max-width into CSS variables,
preserving breakpoint and variant rules. The server-emitted variables survive
hydration; padding and scroll padding use CSS calculations without padding
observers or additive animations. Set the slide gap on the viewport frame itself;
the viewport also owns its authored width and max-width cap. Settings and overflow
navigation buttons target the viewport itself by its aria-label or layer name.

Loop is enabled by
default in preview and published pages. React clones the slides and the carousel
normalizes the position after `scrollend`. Safari resets its scrolling layer at
loop jumps to avoid missing slide paint. With Loop off, scrolling and snapping remain native CSS. Chromium uses CSS initial
targeting; Safari and Firefox receive a one-time initial-position correction after
hydration. Initialization cancels if the visitor interacts first.
On the Framer canvas the carousel displays the authored layers. For preview and published pages:

1. Apply `withKniffCarouselBoundary` to the common parent of one carousel and its controls.
2. Apply `withKniffCarousel` to its viewport. Place Carousel Settings inside the boundary. Its viewport and boundary name fields are only needed for older, unscoped layouts.
3. Apply `withKniffCarouselPrevious` and `withKniffCarouselNext` directly to your button layers. Their nearest boundary supplies the viewport. Each boundary and viewport has a generated, CSS-addressable data attribute, so layer names can repeat.

`InitialTarget` is an experimental CSS initial-position helper. Place it inside
the chosen slide, make it absolute, and pin all four edges. It uses Roma
Komarov's [scroll-start technique](https://blog.kizu.dev/snappy-scroll-start/).

Copy-ready development wrappers are in `examples/framer`. For production:

```tsx
import { addPropertyControls } from "framer"
import {
  VisibleScrollOverflowSettings as KitComponent,
  visibleScrollOverflowSettingsPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules.
} from "https://framer-kit.kniff.at/0.5.7/scroll-snap.js?external=react,react-dom,framer&target=es2022"

export default function ScrollSettings(props: Record<string, unknown>) {
  return <KitComponent {...props} />
}
addPropertyControls(ScrollSettings, visibleScrollOverflowSettingsPropertyControls)
```

Keep exact versions and the `external` query in remote imports. Property control
registration is explicit; importing the library does not register components.

## Kniff Lightbox

The `@kniff/framer-kit/ramka` entry exports `RamkaSettings`, `withKniffLightboxGallery`,
and `withKniffLightboxTrigger`. Apply the gallery override to a parent and the trigger
override to each image. Place Kniff Lightbox Settings inside the gallery parent.
The lightbox includes neighboring images, zoom controls, and thumbnail previews.
Lightbox looping is always off. Morph transitions and pull to close are always
enabled, and closing morphs to the active image. Settings control Peek or Theater
layout, preload (two neighbors on each side by default), zoom, thumbnail navigation,
and backdrop color, including on
React loop copies.
Inside a registered carousel, opening an image pauses automove until the close morph finishes.
Navigating in the lightbox automatically aligns the corresponding slide using the same snap position as the carousel buttons. Standalone lightboxes leave surrounding scroll containers alone.
React loop copies each retain their own morph source.

Examples are in `examples/framer`. There is no Embla dependency or entry point.
The old `syncEmbla`, `stopAutomove`, and lightbox navigation-button props are removed.

## Development

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run dev:framer
```

Run `pnpm run format` to format JavaScript, TypeScript, and React files with Prettier.
Use `pnpm run format:check` to check formatting and `pnpm run lint` to run Oxlint.
CI runs both checks as part of `pnpm run check`.

The development server is available through the existing Cloudflare tunnel at
`https://framer-kit-dev.kniff.at`. Native browser stress tests run on macOS with
Accessibility and screen capture access:

```sh
swift scripts/macos-wheel.swift --app safari --test --runs 40
```

Use `chrome` or `firefox` for the other browsers. The tool captures the browser
window, watches a 30px strip at the carousel center on the left edge, and saves
candidate blank frames plus gesture results under `/tmp` for visual inspection.

## Production module hosting

The production CDN runs on a Cloudflare Worker at `https://framer-kit.kniff.at`.
See [worker/README.md](worker/README.md) for versioned imports, external dependency
handling, verification, and deployment. Copy-ready production adapters live in
`examples/framer/prod`.

## Release workflow

Releases deploy directly to the Cloudflare Worker/CDN. This package is private
and is not published to npm. GitHub Actions runs CI only.

1. Implement and test a change.
2. Add a changeset and run `pnpm run version-packages` to increment the version and changelog.
3. Add the version to `worker/releases.json`, commit and merge the release to `main`.
4. Create and push the matching Git tag, such as `v0.5.4`.
5. Run `pnpm run worker:deploy` (or `pnpm run release`) from the tagged source.
6. Update the pinned imports in both Framer projects, publish, and verify their pages.

Deployment validates the new version, runs all checks and builds, preserves
historical assets from the live CDN, and uploads the local `dist` output.
No npm publishing credentials or registry release are required.

## License

MIT. See [LICENSE](./LICENSE).
