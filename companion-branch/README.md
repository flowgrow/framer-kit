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

The published runtime exposes `window.__COMPANION_KIT_BUILD__ = "companion-local-2026-11-18-v4"`. Update the marker when changing the copied implementation and assert it before profiling.

Iteration: edit the branch code, mirror it here and commit, publish the branch, reload and verify the marker, then test opening and navigation. No Assets Update step is required for these homepage copies. Apply verified performance fixes back to the Kit source separately.

Framer initially compiled files before their dependencies existed. Recompiling all copies after creation resolved stale missing-module references. All 34 writes returned empty code diagnostics afterward.

Verified on branch deployment `0e06375b4`: marker present, popup absent, ten original photo triggers, opening, keyboard next/previous (0 → 1 → 0), main image sizes 100vw, and ratio-aware thumbnail sizes (about 96px landscape / 72px portrait). A tree audit found 95 local override references and 15 local settings instances across five breakpoints, with zero former Kit references of those types on the homepage. This verifies isolation and basic behavior, not a Safari performance improvement.

## Performance iteration, 2026-11-18

Branch-only changes replace the image morph with a 160ms fade, keep preset/crop CSS installed, restrict neighbor filters to active gestures, defer underlying carousel synchronization until close, and reuse decoded carousel pixels while responsive images load. Main images retain srcset and sizes=100vw; thumbnail sizes remain 72 × max(1, width/height). Kit source and production are unchanged.

Run `pnpm exec node scripts/profile-companion.mjs` for headless installed Chrome, Firefox, and Playwright WebKit at 2560×1363, DPR 2. `RUNS`, `ENGINES`, `PROFILE_DIR`, `EXPECTED_BUILD`, and `TRACE=1` configure profiling. Run `pnpm exec node scripts/check-companion.mjs` for behavior checks in those browsers plus mobile WebKit. Outputs go to /tmp/companion-profile-baseline and /tmp/companion-checks by default. Playwright WebKit is not installed Safari.

Measured v4 before the final fade-duration correction: WebKit opening first/repeat 172/25ms, Firefox 217/75ms, Chrome 183/15ms. Navigation index response was 4–18ms. Original WebKit opening measured 734–776ms, although the original harness did not yet wait for the clicked carousel image to load, so these are diagnostic observations, not a controlled benchmark. Rendering is not consistently smooth: final WebKit navigation frame gaps reached 64–125ms; Chrome had an isolated 1.55s opening stall that did not recur in a trace rerun (130ms maximum opening frame gap). The Chrome trace shows substantial image decoding work. Do not equate an index update with a completed image paint or claim all stalls are fixed.

Behavior checks cover all ten images by keyboard, desktop thumbnail selection and zoom, opening by touch on mobile WebKit, closing, restored page scrolling, and no runtime errors. The final check also asserts the computed 160ms fade duration. No Assets Update step is needed for the branch-local copies.

Final published deployment `79dcadf79` (160ms fade), one fresh-context run per browser: Chrome first opening 115ms, Firefox 209ms, WebKit 163ms; navigation index responses 6–23ms. Largest navigation frame gaps were Chrome 108ms, Firefox 47ms, WebKit 80ms. The next full-resolution image took 2.14s in WebKit and exceeded the 2.2s observation window in Chrome; preview pixels can appear sooner. This is still a loading/rendering limitation, not a claim of delay-free navigation. All four behavior targets passed the 160ms fade assertion; Firefox scroll unlock failed one fixed-wait check and passed a rerun with an explicit completion wait.
