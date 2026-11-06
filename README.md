# @kniff/framer-kit

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
Canvas scopes each settings instance to its own boundary so breakpoint-specific
alignment and Edge Space controls do not override neighbouring breakpoint frames.
Keep the settings component inside its boundary. Canvas preserves visible overflow
so every original slide remains editable. A
CSS-only preview places the last slide before the first, preserving its own size
and accounting for viewport padding. Edge Space is always enabled with Loop.

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
} from "https://framer-kit.kniff.at/0.5.6/scroll-snap.js?external=react,react-dom,framer&target=es2022"

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
layout, preload (two neighbors on each side by default), zoom, counter visibility,
thumbnail navigation, carousel synchronization, and backdrop color, including on
React loop copies.
Opening an image always pauses carousel automove until the close morph finishes.
`syncKniffCarousel` synchronizes subsequent lightbox navigation using the same
alignment as carousel buttons; the initially clicked slide stays in place.
React loop copies each retain their own morph source.

Examples are in `examples/framer`. There is no Embla dependency or entry point.
The old `syncEmbla`, `stopAutomove`, and lightbox navigation-button props are removed.

## Development

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run dev:framer
```

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
