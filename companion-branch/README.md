# Companion branch runtime copies

Framer project: https://framer.com/projects/The-Companion--s8t6yE6lekXltgaL4N73-jdLHQ?branch=y0f6w208o

Published branch: https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app

`CompanionLocal/` mirrors the branch's code files. The 34 files were copied from the live Framer Kit project, retaining its relative dependency graph. The carousel touch-intent import now resolves locally. Ramka remains the existing external @ramka/react 0.0.2 dependency.

The homepage uses local Overrides.tsx exports and local settings components. Existing slide layers, button components, images, and settings values are preserved. Other pages retain their existing references.

Homepage settings instance replacements:

| Original  | Local     | Purpose                  |
| --------- | --------- | ------------------------ |
| yfMICjaux | xNUKA_k7b | Photo lightbox settings  |
| NgGvyUR5k | lDGxmgxY1 | Photo carousel settings  |
| RSt_3XQtN | lms6kQNqz | Events carousel settings |

The published runtime exposes `window.__COMPANION_KIT_BUILD__ = "companion-local-2026-11-18-v5"`. Update the marker when changing the copied implementation and assert it before profiling.

Iteration: edit the branch code, mirror it here and commit, publish the branch, reload and verify the marker, then test opening and navigation. No Assets Update step is required for these homepage copies. Apply verified performance fixes back to the Kit source separately.

Framer initially compiled files before their dependencies existed. Recompiling all copies after creation resolved stale missing-module references. All 34 writes returned empty code diagnostics afterward.

Verified on branch deployment `0e06375b4`: marker present, popup absent, ten original photo triggers, opening, keyboard next/previous (0 → 1 → 0), main image sizes 100vw, and ratio-aware thumbnail sizes (about 96px landscape / 72px portrait). A tree audit found 95 local override references and 15 local settings instances across five breakpoints, with zero former Kit references of those types on the homepage. This verifies isolation and basic behavior, not a Safari performance improvement.

## Performance iteration, 2026-11-18

Branch-only changes replace the image morph with a 160ms fade, keep preset/crop CSS installed, restrict neighbor filters to active gestures, defer underlying carousel synchronization until close, and reuse decoded carousel pixels while responsive images load. Main images retain srcset and sizes=100vw; thumbnail sizes remain 72 × max(1, width/height). Kit source and production are unchanged.

Run `pnpm exec node scripts/profile-companion.mjs` for headless installed Chrome, Firefox, and Playwright WebKit at 2560×1363, DPR 2. `RUNS`, `ENGINES`, `PROFILE_DIR`, `EXPECTED_BUILD`, and `TRACE=1` configure profiling. Run `pnpm exec node scripts/check-companion.mjs` for behavior checks in those browsers plus mobile WebKit. Outputs go to /tmp/companion-profile-baseline and /tmp/companion-checks by default. Playwright WebKit is not installed Safari.

Measured v4 before the final fade-duration correction: WebKit opening first/repeat 172/25ms, Firefox 217/75ms, Chrome 183/15ms. Navigation index response was 4–18ms. Original WebKit opening measured 734–776ms, although the original harness did not yet wait for the clicked carousel image to load, so these are diagnostic observations, not a controlled benchmark. Rendering is not consistently smooth: final WebKit navigation frame gaps reached 64–125ms; Chrome had an isolated 1.55s opening stall that did not recur in a trace rerun (130ms maximum opening frame gap). The Chrome trace shows substantial image decoding work. Do not equate an index update with a completed image paint or claim all stalls are fixed.

Behavior checks cover all ten images by keyboard, desktop thumbnail selection and zoom, opening by touch on mobile WebKit, closing, restored page scrolling, and no runtime errors. The final check also asserts the computed 160ms fade duration. No Assets Update step is needed for the branch-local copies.

Final published deployment `79dcadf79` (160ms fade), one fresh-context run per browser: Chrome first opening 115ms, Firefox 209ms, WebKit 163ms; navigation index responses 6–23ms. Largest navigation frame gaps were Chrome 108ms, Firefox 47ms, WebKit 80ms. The next full-resolution image took 2.14s in WebKit and exceeded the 2.2s observation window in Chrome; preview pixels can appear sooner. This is still a loading/rendering limitation, not a claim of delay-free navigation. All four behavior targets passed the 160ms fade assertion; Firefox scroll unlock failed one fixed-wait check and passed a rerun with an explicit completion wait.


## Scroll lock and hydration regression repair

Deployment `f532faccb` disables `triggerActions` on hidden seasonal promo overlays JAYSObhH0, gD6wPUQdj, NNsmhOdhO in the branch layout template. The original node attributes are saved in disabled-promo-triggers.json. Hiding the Winter Promo did not disable its delayed opening trigger: Framer locked document scrolling after three seconds without showing its contents. Ramka subsequently restored that already-locked state. A wheel-input reproduction confirmed this before any lightbox interaction; disabling the trigger restored actual wheel scrolling in Chrome, Firefox and WebKit before opening and after four open/close cycles each.

The persistent preset style also caused a server/client text mismatch after Framer processed its CSS. Under delayed module loading, WebKit logged React 425/422 followed by repeated 421 errors. Inserting the static stylesheet with dangerouslySetInnerHTML (as with our other static CSS) eliminated those errors in one WebKit reproduction; subsequent slower Chrome runs still exposed 421 errors from setup updates. This fixes the style source mismatch instead of suppressing React warnings.

The browser check now waits beyond the promo delay, verifies actual wheel scrolling before and after lightbox use, and fails on recoverable React console errors as well as page errors. Run `SLOW_MODULES=700 pnpm exec node scripts/check-companion.mjs` to exercise hydration with delayed module delivery. The earlier checks did not catch console warnings and did not test scrolling before lightbox opening; their pass result was insufficient.

Deployment `8e301e2c5` additionally wraps gallery item/config registration and carousel viewport/settings/loop setup updates in React.startTransition. These setup updates may otherwise interrupt still-hydrating Framer Suspense children. User-triggered lightbox opening and navigation remain urgent. The first delayed-module Chrome rerun passed with no recoverable React errors.


## Restored morph and dismissal handoff

Morph is again the default. Lightbox Settings exposes an explicit Transition control with Morph and Fade choices; the original morph duration is retained, and the opt-in fade uses 160ms. No production or Kit project files were changed.

A real Chromium touch pull-to-dismiss followed by horizontal wheel input reproduced repeated opposing movement: the auto-scroll controller restored native snapping on each wheel delta. It now keeps snapping disabled during that wheel gesture and cancels any pending settle animation when fresh wheel input arrives. The same reproduction then showed no opposing movement. `PULL=1 NAV=9 GESTURE_DELAY=300 ENGINES=chrome pnpm exec node scripts/check-lightbox-carousel-handoff.mjs` asserts this using actual browser touch input and wheel events. `WHEEL=1` tests keyboard-close followed by wheel input in other engines; it does not claim to emulate native Safari touch dragging.

Hydration fixes retain stable Framer layer elements across registration-only renders, defer non-interactive registration updates, and preserve original slide positions while adding loop copies. Lightbox indices now follow document order instead of whichever lazy override happened to hydrate first. The slow-module checks continue to fail on any recoverable React console error.
