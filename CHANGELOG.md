# @kniff/framer-kit

## 0.3.0

### Minor Changes

- [`7f1fa8b`](https://github.com/flowgrow/framer-kit/commit/7f1fa8b8c951b7ebadaa8dda10ce3de57e0d0e9a) Thanks [@flowgrow](https://github.com/flowgrow)! - Bundle the complete Framer Carousel Settings component, its prop types,
  property controls, Embla plugins, and overflow behavior behind a thin wrapper.

- [`73dcf0d`](https://github.com/flowgrow/framer-kit/commit/73dcf0deb3fff4a734cc40fce832ec14f0aa37e6) Thanks [@flowgrow](https://github.com/flowgrow)! - Add Framer-ready Embla navigation, dots, slide counters, progress, and
  thumbnail-connection components with explicit property-control registration.

- [`ebb17a7`](https://github.com/flowgrow/framer-kit/commit/ebb17a7f62c8f5c0fa39dd1cf3c110b6a13688a0) Thanks [@flowgrow](https://github.com/flowgrow)! - Narrow the package to its Embla carousel API by removing the generic core,
  hooks, and data-attribute override entry points.

- [`ed9b5e8`](https://github.com/flowgrow/framer-kit/commit/ed9b5e8c5c3d56e07f3b2e456c50a8d116bf048f) Thanks [@flowgrow](https://github.com/flowgrow)! - Add bundled Embla carousel overrides and a shared Zustand configuration store
  for regular stacks, CMS collections, and navigation visibility.

- [`ed9b5e8`](https://github.com/flowgrow/framer-kit/commit/ed9b5e8c5c3d56e07f3b2e456c50a8d116bf048f) Thanks [@flowgrow](https://github.com/flowgrow)! - Create the initial Framer library with modular exports, SSR-safe hooks,
  structured-data helpers, an override factory, tests, and automated releases.

- [`9a666b3`](https://github.com/flowgrow/framer-kit/commit/9a666b3f3b4ef6049bc1d8ab2d963513b3a8a2a2) Thanks [@flowgrow](https://github.com/flowgrow)! - Add a parent-scoped Ramka lightbox integration for existing Framer layers,
  including settings, trigger overrides, and optional Embla synchronization.

- [`b5c87ba`](https://github.com/flowgrow/framer-kit/commit/b5c87badf2e3addbdcd9ae6abf874459efd718b6) Thanks [@flowgrow](https://github.com/flowgrow)! - Remove the JSON-LD component, schema helpers, and their public package entry
  points.

### Patch Changes

- [`9730ce7`](https://github.com/flowgrow/framer-kit/commit/9730ce789881b65a195de430e31bcea184d27a7e) Thanks [@flowgrow](https://github.com/flowgrow)! - Add the optional `selectOnSlideClick` Carousel Settings behavior, exposed in
  Framer as **Click to Select**, to scroll the carousel to a clicked slide. When
  the carousel is registered as thumbnails by `ThumbnailConnection`, route the
  clicked slide index directly to the connected main carousel as recommended by
  Embla's thumbnail pattern.
  Slides also use a pointer cursor while the behavior is enabled.
  
  Add a **Contain Edges** setting that maps to Embla's `containScroll`, allowing
  edge slides to use normal alignment when disabled.
  Synchronize thumbnail drag selection back to the connected main carousel while
  mapping contained snap groups to their corresponding slide indices.
  Forward thumbnail pointer interactions to the connected main carousel so its
  autoplay or auto-scroll plugin honors **Stop on Interaction**.
  Read modern Framer Slot controls as direct React nodes so connected counter,
  navigation, and progress components render correctly. Counter replacements are
  provided as strings so Framer Rich Text layers render their values.
  Preserve single-child element structure while replacing nested text, which is
  required by Framer's Rich Text renderer.
  Add a **Scroll Updates Main** option to `ThumbnailConnection` so thumbnail
  scrolling can be decoupled from main-carousel selection when desired.
  Add an **Instructions** toggle to `ThumbnailConnection` for its Canvas-only
  setup card; Preview and published output remain headless.
  Use an invisible Canvas sentinel when instructions are disabled to suppress
  Framer's automatic empty-component placeholder.

- [`e244290`](https://github.com/flowgrow/framer-kit/commit/e244290b65ae093646055f9a1c5352c0365a9a2c) Thanks [@flowgrow](https://github.com/flowgrow)! - Add a one-command local Framer development server using a stable Cloudflare
  Tunnel hostname.

- [`62cd48d`](https://github.com/flowgrow/framer-kit/commit/62cd48d8f4669501776bcacf1ef2154a0f30a150) Thanks [@flowgrow](https://github.com/flowgrow)! - Update the local Framer examples to use discoverable component and override
  proxies for HTTPS development imports.

- [`c7c858b`](https://github.com/flowgrow/framer-kit/commit/c7c858b2d9a4b54e5be79243e751be3747217969) Thanks [@flowgrow](https://github.com/flowgrow)! - License the package under the MIT License.

- [`9730ce7`](https://github.com/flowgrow/framer-kit/commit/9730ce789881b65a195de430e31bcea184d27a7e) Thanks [@flowgrow](https://github.com/flowgrow)! - Mirror responsive Framer stack gaps across the Embla loop seam, prevent
  thumbnail synchronization from overriding wrapped navigation, and center the
  fallback counters and pagination dots. Position the generated viewport so
  Embla measures the container and its slides in the same coordinate system,
  including the generated final-slide margin in its loop distance. Remove the
  overflow control from Carousel Settings and leave the added Embla viewport
  visible so the overridden Framer stack owns clipping. Apply the seam margin
  before initializing Embla and defer that initialization until Framer's
  responsive stack geometry has settled. Use Embla's root node as the
  authoritative viewport for later responsive measurements.
