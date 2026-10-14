# @kniff/framer-kit

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
