# @kniff/framer-kit

Native scroll-snap carousels and Kniff lightboxes for Framer. React, React DOM,
and Framer are supplied by the host; implementations are safe to import during SSR.

## Scroll-snap carousel

Use a full-width boundary containing a centered sizing frame with your usual
Framer width. Place one viewport frame inside the sizing frame, set its max width, and put the
slides inside that viewport. Percentage slide widths stay based on the sizing
frame. The component adds full-width bleed gutters to your authored padding.

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
the sizing container controls available width and alignment, while the viewport owns the max-width cap.

Loop is enabled by
default in preview and published pages. React clones the slides and the carousel
normalizes the position after `scrollend`. Safari resets its scrolling layer at
loop jumps to avoid missing slide paint. Disabling Loop keeps the layout CSS-only.
Canvas preserves visible overflow so every original slide remains editable. A
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
} from "https://framer-kit.kniff.at/builds/3c1b881ec7a2c897d33b20e0/scroll-snap.js?external=react,react-dom,framer&target=es2022"

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
enabled, and closing morphs to the active image. Settings control preload, zoom,
counter visibility, carousel synchronization, and backdrop color, including on
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


Releases use npm trusted publishing (OIDC), without an `NPM_TOKEN` secret.
In the [npm package settings](https://www.npmjs.com/package/@kniff/framer-kit/access),
add a GitHub Actions trusted publisher with these values:

- Organization or user: `flowgrow`
- Repository: `framer-kit`
- Workflow filename: `release.yml`
- Environment name: leave blank (the workflow does not use an environment).
- Allowed actions: enable direct publishing (`npm publish`).

The release job grants `id-token: write` and uses Node 24, whose bundled npm
supports OIDC. pnpm and Changesets remain the commands used by the workflow;
pnpm delegates registry publishing to that npm CLI. No static registry token is
configured. See [npm's trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

1. Implement and test a change.
2. Run `pnpm run changeset` and choose patch, minor, or major.
3. Push to `main`.
4. The Changesets action opens or updates a release pull request.
5. Merging that pull request publishes to npm using OIDC and creates
   a matching GitHub Release with a version tag and notes from the generated
   changelog, using `GITHUB_TOKEN`.

## License

MIT. See [LICENSE](./LICENSE).
