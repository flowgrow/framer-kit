# Morph opening investigation — 2026-11-18

The published v6 branch has a verified cold-opening stylesheet initialization problem. Reading `borderRadius` is not intrinsically expensive: the read forces style work that Ramka just invalidated. No production component or published deployment was changed during this investigation.

## Evidence

Target: https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app/

Headless Playwright WebKit 27.2, installed Chrome 157, and Firefox 157; desktop 2560×1363, DPR 2. Popup absent; clicked carousel image loaded before measurement. Playwright WebKit is not installed Safari.

Test-only wrappers capture stylesheet adoption, DOM writes, slow style/layout reads, call stacks, and view-transition lifecycle. Chrome additionally records native style-invalidation events and affected element counts. Instrumentation adds overhead; separate runs without these wrappers confirm the cold-opening improvement. These are diagnostic samples, not benchmark distributions.

### Cold stylesheet installation

On first click, Ramka installs its structural view-transition stylesheet into `document.adoptedStyleSheets`. The next trigger `borderRadius` read takes about 122 ms in WebKit. Preparing the portal then installs the media-fill stylesheet; the following `objectFit` read takes about 132 ms. Composited morph styles are also installed around transition startup, followed by another long style/layout flush.

Moving the existing library stylesheet initialization before interaction eliminates these large synchronous read costs. In the combined diagnostic experiment, `objectFit` takes 6 ms and `borderRadius` no longer exceeds the 4 ms recording threshold. Morph geometry and animation remain enabled.

An append-only adopted-sheet experiment did not eliminate the stalls. Merely changing spread assignment to `push()` is not a sufficient fix.

### Unnecessary whole-document isolation

Ramka's name detector considers every nonempty value other than `none` a transition name. Framer's editor-bar reset expands to `view-transition-name: unset`, so the detector returns true. Inspection found no custom names on page elements; only the HTML default `root` name was active.

This false positive enables `:root[data-ramka-vt-isolate] *`. Chrome's native invalidation trace explicitly identifies this selector as invalidating the entire subtree. Large style updates touch roughly 2,600 elements, including work when the isolation attribute is removed after the animation.

The test-only detector correction ignores CSS-wide reset keywords. It prevents the isolation attribute on this page. By itself, it does not materially remove the cold-opening delay; stylesheet initialization remains the dominant verified cold cost. Production handling of `inherit`, CSS variables and actual foreign names needs a properly scoped detector implementation, not blanket disabling of isolation.

## Measured boundaries

Uninstrumented WebKit baseline: first dialog-visible frame 627 ms; reopening 209 ms. Combined warm-styles/name-detector experiment: first visible frame 186 ms; reopening 207 ms. The improvement is chiefly cold opening, not repeat opening. A separate warm-styles-only run, leaving the name detector unchanged, reached the first visible frame at 184 ms. This isolates stylesheet initialization as the primary verified contributor.

With detailed instrumentation, baseline reaches `startViewTransition()` at 309 ms and `ready` at 501 ms. Combined experiment reaches them at 39 ms and 184 ms. `ready` and the first sampled visible frame are different boundaries; neither proves a smooth completed animation.

Chrome and Firefox open and navigate under the combined experiment. Their first-visible samples were 166 ms and 285 ms respectively; these are not controlled before/after comparisons for those engines. WebKit retains substantial frame stalls, including during navigation. This investigation does not resolve React 421, demonstrate fast navigation, or establish the exact cause of every remaining snapshot/paint stall.

## Reproduction

```sh
ENGINES=webkit RUNS=2 PROFILE_DIR=/tmp/companion-morph-baseline-clean pnpm exec node scripts/profile-companion.mjs
ENGINES=webkit RUNS=2 RENDER_TRACE=1 PROFILE_DIR=/tmp/companion-morph-writes pnpm exec node scripts/profile-companion.mjs
ENGINES=chrome RUNS=1 TRACE=1 RENDER_TRACE=1 PROFILE_DIR=/tmp/companion-morph-chrome-writes pnpm exec node scripts/profile-companion.mjs
ENGINES=webkit RUNS=2 EXPERIMENT=ignore-css-wide-names PROFILE_DIR=/tmp/companion-morph-ignore-unset pnpm exec node scripts/profile-companion.mjs
ENGINES=webkit RUNS=1 RENDER_TRACE=1 EXPERIMENT=warm-styles-only PROFILE_DIR=/tmp/companion-morph-warm-only pnpm exec node scripts/profile-companion.mjs
ENGINES=webkit,chrome,firefox RUNS=2 EXPERIMENT=warm-morph-styles PROFILE_DIR=/tmp/companion-morph-warm-clean pnpm exec node scripts/profile-companion.mjs
```

Experiments intercept the published module only inside the isolated test browser. They deliberately reference the inspected runtime's internal names and reject an unexpected detector shape. They are proof-of-cause probes, not code suitable for shipping. The `warm-morph-styles` experiment includes the detector correction; `warm-styles-only` leaves the detector untouched.

Raw traces and JSON are in the `/tmp/companion-morph-*` directories above, with additional detailed runs under `companion-morph-adoption`, `companion-morph-names`, and `companion-morph-warm`. Browser instances close after each run.

## Implementation direction

Expose/init the library's static structural, media-fill, and composited styles once before the first interaction, through a supported Ramka entry point. Keep the styles installed. Correct the foreign-name detector so CSS reset declarations do not enable universal descendant isolation. Then profile the remaining transition capture/paint interval and navigation independently. Do not replace morph with fade to meet the timing target.
