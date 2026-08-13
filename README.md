# @kniff/framer-kit

Reusable, SSR-safe building blocks for Framer code components and overrides.
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

## Import from Framer

After publishing a release, import an exact version through esm.sh:

```tsx
import {
  useMeasuredSize,
} from "https://esm.sh/@kniff/framer-kit@0.1.0/hooks?external=react,react-dom,framer"
```

For an override factory:

```tsx
import {
  createDataAttributeOverride,
} from "https://esm.sh/@kniff/framer-kit@0.1.0/overrides?external=react,react-dom,framer"

export const withTrackingName = createDataAttributeOverride(
  "data-tracking-name",
  "hero-booking",
)
```

Pinning the full version makes upgrades and rollbacks a one-line change.

### Embla overrides

Embla Carousel and Zustand are bundled into the `embla` entry. A Framer
override file only needs to re-export the overrides it uses:

```tsx
export {
  withCmsEmbla,
  withEmbla,
  withHideNavigationWhenNoScrollableSlides,
} from "https://esm.sh/@kniff/framer-kit@0.1.0/embla?external=react,react-dom,framer"
```

Use `withEmbla` for a regular stack and `withCmsEmbla` for a CMS collection.
Apply `withHideNavigationWhenNoScrollableSlides` to navigation that should
disappear when the connected carousel cannot scroll.

The carousel layer must have a custom Layers-panel name or an `aria-label`.
That value is the ID shared with the Carousel Settings component. Replace the
old Framer-hosted store import in that component with the package store:

```tsx
import {
  useEmblaStore,
} from "https://esm.sh/@kniff/framer-kit@0.1.0/embla?external=react,react-dom,framer"
```

The store retains the existing `addConfig`, `removeConfig`, `getConfig`,
`addEmblaInstance`, `removeEmblaInstance`, and `getInstance` API. The settings
component and all overrides must import the same exact package version so they
share one store instance.

The overrides own Embla's structural CSS. No separate stylesheet is required:
the viewport clips overflow, the container uses horizontal-carousel touch
behavior, and its direct DOM children become slides. Existing Framer slide
widths are preserved by default with `slideSize: "auto"`. Carousel Settings can
override the structural values alongside regular Embla options:

```tsx
useEmblaStore.getState().addConfig("Featured", {
  options: { align: "start", loop: true },
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

- `@kniff/framer-kit/core` — browser-safe utilities.
- `@kniff/framer-kit/hooks` — reusable React hooks.
- `@kniff/framer-kit/components` — code-component building blocks.
- `@kniff/framer-kit/overrides` — override factories.
- `@kniff/framer-kit/embla` — bundled Embla overrides and shared state.
- `@kniff/framer-kit/schema` — structured-data builders and serialization.

## Release workflow

1. Implement and test a change.
2. Run `npm run changeset` and choose patch, minor, or major.
3. Push to `main`.
4. The Changesets action opens or updates a release pull request.
5. Merging that pull request publishes to npm using `NPM_TOKEN`.

The package is intentionally marked `UNLICENSED` until an explicit license is
chosen. Publishing publicly does not itself require granting reuse rights.
