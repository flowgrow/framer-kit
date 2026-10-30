# @kniff/framer-kit

## 0.5.0

### Minor Changes

- Add React-owned loop copies, carousel navigation controls, and automatic motion for the native CSS scroll-snap carousel. Apply `withKniffCarousel` to the viewport to enable looping. Preserve canvas slide dimensions and padding with CSS-only positioning, and always enable Edge Space when looping.

  Match Ramka's default lightbox presentation with neighboring images, zoom controls, and thumbnails. Always pause carousel motion while opening or closing the lightbox; resume only after the close morph completes. Synchronize subsequent navigation using the carousel's authored snap alignment with `syncKniffCarousel`. Each React copy supplies its own morph source. Remove lightbox previous/next buttons and runtime console output. Embla remains completely removed.

## 0.4.0

### Minor Changes

- Add CSS scroll-snap overflow settings and the experimental InitialTarget helper, with a dedicated scroll-snap entry and Framer wrapper examples.

  Add native looping with a Safari scroll-layer reset after loop jumps, preserve authored padding, and keep slides editable in canvas.

  Remove the Embla entry, runtime dependencies, and Ramka-specific Embla synchronization.

## 0.3.1

### Patch Changes

- Render named carousel structure and slide styles during SSR to avoid remounting Framer/CMS content when settings register after hydration. Prevent style-text hydration mismatches caused by Framer CSS minification.

  Reserve configured carousel layout while hiding its content until Embla has applied its initial snap, preventing the first slide flashing at the left before initialization.

## 0.3.0

### Minor Changes

- [`86e600d`](https://github.com/flowgrow/framer-kit/commit/86e600d4a49865e2b671a0fd1b8cd59360fce462) Thanks [@flowgrow](https://github.com/flowgrow)! - Apply the loop seam gap to the last non-empty slide so trailing empty CMS loading wrappers do not receive the margin instead.

### Patch Changes

- [`e1fe99a`](https://github.com/flowgrow/framer-kit/commit/e1fe99adaa3120aaf0037b5606f459143b5b5620) Thanks [@flowgrow](https://github.com/flowgrow)! - Keep carousel navigation buttons disabled until their carousel API is connected.

- [`86e600d`](https://github.com/flowgrow/framer-kit/commit/86e600d4a49865e2b671a0fd1b8cd59360fce462) Thanks [@flowgrow](https://github.com/flowgrow)! - Improve hydration handling using React server and client snapshots, remove separate canvas override branches, and use intrinsic sizing for Ramka trigger images. Split Ramka gallery and trigger implementations and make settings dependencies and event subscription cleanup explicit.
