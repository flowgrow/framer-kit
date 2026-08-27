# @kniff/framer-kit

Bundled, SSR-safe Embla carousel and Ramka lightbox integrations for Framer.
The package keeps canvas files deliberately small while centralizing tested,
versioned implementation code.

## Principles

- Exact package versions in every Framer import.
- No browser or DOM access during module evaluation or initial SSR rendering.
- React, React DOM, and Framer remain peer dependencies supplied by the host.
- Property-control registration is explicit rather than hidden in import side
  effects.
- Public browser code contains no credentials or server-side secrets.
- User-visible changes ship with a Changeset.

## Install for local development

```bash
npm install
npm run check
```

## Local Framer development

The stable hostname for this repository is already provisioned. These are the
one-time commands used to create it; they do not need to run again on this Mac:

```bash
cloudflared tunnel login
cloudflared tunnel create framer-kit-dev
cloudflared tunnel route dns framer-kit-dev framer-kit-dev.kniff.at
```

Run the build watcher, CORS-enabled local server, and named Cloudflare Tunnel
together:

```bash
npm run dev:framer
```

Then use the stable development URL in the copy-ready files under
[`examples/framer`](./examples/framer). For example:

```tsx
import { addPropertyControls } from "framer"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import { EmblaDots as KitComponent, emblaDotsPropertyControls } from "https://framer-kit-dev.kniff.at/embla.js"

interface Props {
  [key: string]: unknown
}

export default function EmblaDots(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(EmblaDots, emblaDotsPropertyControls)
```

Use the same URL for the settings component and overrides so they share one
store instance. The development server disables caching and serves all emitted
chunks from `dist`; keep `npm run dev:framer` running while Framer loads them.
If Framer keeps an already-compiled remote module after a source change, append
the same cache-busting query to every wrapper import (for example,
`/embla.js?v=2`). Never bump only one wrapper because distinct URLs create
distinct store instances.
The local function is required because Framer only discovers code components
and overrides declared in the current code file; a direct re-export of a remote
component does not appear in the Insert or Overrides menus.

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

When the triggers are Embla slides, Ramka navigation selects the matching
Embla snap behind the overlay and opening the lightbox forwards the interaction
to Embla's autoplay/auto-scroll plugin. The bridge is attached to the Embla DOM
viewport, so it keeps working when `/embla.js` and `/ramka.js` are loaded as
separate remote modules.

Copy-ready thin files live at
[`examples/framer/RamkaOverride.tsx`](./examples/framer/RamkaOverride.tsx) and
[`examples/framer/RamkaSettings.tsx`](./examples/framer/RamkaSettings.tsx).
Use the same cache-busting query on both remote imports during local testing.

## Import from Framer

Embla Carousel, its plugins, and Zustand are bundled into the `embla` entry.
The Framer override file declares tiny local proxies so Framer can discover
them:

```tsx
import type { ComponentType } from "react"
import { withEmbla as kitWithEmbla } from "https://esm.sh/@kniff/framer-kit@0.2.0/embla?external=react,react-dom,framer&target=es2022"

export function withEmbla(
  Component: ComponentType<any>,
): ComponentType<any> {
  return kitWithEmbla(Component)
}
```

The bundle keeps `react`, `react-dom`, and `framer` as host-provided imports.
With esm.sh, keep the `external` query so it preserves those bare specifiers
instead of rewriting them to CDN copies (which can create duplicate React
runtimes in Framer).

Use `withEmbla` for regular stacks and CMS collection lists. Dynamic CMS
items are incorporated on the first sub-pixel `scroll` event after active
motion, so infinite loading does not interrupt the current animation. Empty
CMS wrapper nodes (for example, a spinner container after the final page)
are excluded from Embla's slide list and trigger a refresh when their contents
disappear.
Apply `withHideNavigationWhenNoScrollableSlides` to navigation that should
disappear when the connected carousel cannot scroll.

Carousel Settings follows the same thin-proxy pattern. Its behavior, property
controls, plugin setup, store registration, and canvas UI live in this package;
the local file only declares the component and attaches the imported controls.
The carousel layer must have a custom Layers-panel name or an `aria-label`.
That value is the ID selected in Carousel Settings. The settings component and
all overrides must import the same exact package version so they share one
store instance.

## Embla accessory components

The package also contains the separate code components needed to work around
Framer's override and property-control boundaries:

| Component | Purpose |
| --- | --- |
| `EmblaNavigationButton` | Previous/next control with a connected Framer Slot |
| `EmblaDots` | Styled, clickable snap navigation |
| `EmblaCurrentIndex` | Writes the selected one-based index into a connected Slot |
| `EmblaTotalSlides` | Writes the page count into a connected Slot |
| `EmblaProgressBar` | Native progress or connected Track and Fill Slots |
| `ThumbnailConnection` | Synchronizes IDs and routes thumbnail clicks to the main carousel |

Each one remains a separate Framer code file, but that file is only a thin
proxy. Copy-ready wrappers for all six components, Carousel Settings, and the
overrides live in [`examples/framer`](./examples/framer).
For npm usage, replace the development URL with the same exact versioned
`esm.sh` URL used by Carousel Settings and the overrides. Keeping that URL
identical is essential: separate module URLs can create separate Zustand stores
that cannot see one another's carousel registrations.

The overrides own Embla's structural CSS. No separate stylesheet is required:
the added Embla viewport leaves overflow visible, the container uses
horizontal-carousel touch behavior, and its direct DOM children become slides.
Use the Framer stack's own Overflow setting when the carousel should clip.
Existing Framer slide widths are preserved by default with
`slideSize: "auto"`. In loop mode the override also reads the Framer stack's
computed responsive gap, mirrors it as a final-slide margin at the loop seam,
and re-initializes Embla when that measured gap changes. Advanced store usage
can still override structural values alongside regular Embla options:

```tsx
useEmblaStore.getState().addConfig("Featured", {
  options: { align: "start", loop: true },
  selectOnSlideClick: true,
  styles: {
    slideSize: "80%",
    touchAction: "pan-y",
  },
})
```

When cleaning up a settings registration, pass the same config object to
`removeConfig(id, config)`. This prevents an older component instance from
removing a newer registration that happens to use the same layer name. Calling
`removeConfig(id)` remains supported for compatibility.

The carousel activates after React hydration as soon as its matching config is
available. Missing IDs or settings leave the original Framer component visible;
a console warning is emitted for a missing ID instead of showing diagnostics to
site visitors.

`embla-carousel-react` and `zustand` are intentionally regular dependencies.
The build bundles and tree-shakes all installed runtime packages by default;
React, React DOM, and Framer remain host-provided externals.

## Package areas

- `@kniff/framer-kit/embla` — bundled Embla overrides and shared state.
- `@kniff/framer-kit/ramka` — bundled Ramka gallery and trigger overrides.
- `@kniff/framer-kit` — convenience root export of the same Embla API.

## Release workflow

1. Implement and test a change.
2. Run `npm run changeset` and choose patch, minor, or major.
3. Push to `main`.
4. The Changesets action opens or updates a release pull request.
5. Merging that pull request publishes to npm using `NPM_TOKEN`.

## License

Released under the [MIT License](./LICENSE).
