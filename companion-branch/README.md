# Companion branch runtime copies

Project: https://framer.com/projects/The-Companion--s8t6yE6lekXltgaL4N73-jdLHQ?branch=y0f6w208o

Published branch: https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app

`CompanionLocal/` mirrors the branch's 34 code files, copied from the live Framer Kit project with relative dependencies. Ramka remains the external @ramka/react 0.0.2 dependency. The homepage uses local overrides and settings; other pages retain their existing references. Kit source and Companion production were not changed.

Homepage settings replacements:

| Original | Local | Purpose |
| --- | --- | --- |
| yfMICjaux | xNUKA_k7b | Photo lightbox settings |
| NgGvyUR5k | lDGxmgxY1 | Photo carousel settings |
| RSt_3XQtN | lms6kQNqz | Events carousel settings |

The initial audit found 95 local override references and 15 local settings instances across five breakpoints, with zero former Kit references of those types on the homepage. Slide layers, images, button components and settings values were preserved.

## Current behavior

Morph is the default. Lightbox Settings has an explicit Transition control offering Morph or Fade. Morph retains its original 360ms duration; opt-in Fade uses 160ms. Main images retain srcset and sizes=100vw; thumbnail sizes are 72 × max(1, width/height). Fast morph opening has not yet been established across browsers.

The preset stylesheet remains installed between lightbox openings. It is installed once in document.head, avoiding extra style siblings in Framer layer markup. Inactive slide filters are limited to active gestures, and decoded carousel pixels provide a preview while larger images load.

Hidden seasonal promo overlays still had delayed opening triggers, causing Framer to set document overflow:hidden without displaying a popup. Their triggerActions were removed in this branch. Original node attributes are saved in disabled-promo-triggers.json.

The auto-scroll controller previously restored native snapping after each horizontal wheel delta, making fresh input fight the previous snap target after dismissal. It now keeps snapping disabled during that wheel gesture and cancels pending settle motion when fresh wheel input arrives. Snapping after input ends is retained.

Lightbox indices follow document order rather than lazy-component registration order. Gallery setup updates are non-urgent, and registry-only changes preserve the rendered Framer layer. Experimental carousel startup/hydration observers and placeholder changes were reverted after mixed results; the carousel's original setup and loop machinery remain in place.

## Verification and remaining issue

Build marker: window.__COMPANION_KIT_BUILD__ = companion-local-2026-11-18-v6.

Current deployment, including persistent CSS in document.head: 43a3fb975.

A real Chromium touch pull-to-dismiss followed by immediate wheel input reproduced the repeated opposing movement. The updated gesture checks passed at 150ms and 300ms delays, including the final photo near the loop boundary. WebKit and Firefox keyboard-close followed by wheel input also passed the no-opposing-movement assertion. This is not a native Safari touch-drag test.

React 421 remains reproducible under delayed module loading, including Chrome and WebKit. It is not considered fixed. Tests retain an explicit failure on these recoverable console errors. Do not describe a successful interaction as a fully passing run when its console-error assertion fails.

## Test loop

Edit branch code, mirror it here and commit, publish the branch, verify the marker, then test the published site. No Assets Update is needed for these homepage copies. Apply verified changes to Kit separately.

- `pnpm exec node scripts/check-companion.mjs`: installed Chrome, Firefox, desktop WebKit and mobile WebKit. Checks page scrolling before/after lightbox use, loop initialization and six copies, all ten photos, thumbnails, desktop zoom, transition duration and console errors.
- `SLOW_MODULES=700 pnpm exec node scripts/check-companion.mjs`: delays module delivery to exercise hydration. ENGINES can select targets.
- `PULL=1 NAV=9 GESTURE_DELAY=300 ENGINES=chrome pnpm exec node scripts/check-lightbox-carousel-handoff.mjs`: real browser touch input, then wheel input; asserts no opposing movement during the wheel gesture.
- `WHEEL=1 NAV=9 GESTURE_DELAY=300 ENGINES=webkit,firefox pnpm exec node scripts/check-lightbox-carousel-handoff.mjs`: keyboard dismissal plus wheel input in those engines.
- `pnpm exec node scripts/profile-companion.mjs`: headless profiling at 2560×1363, DPR 2. RUNS, ENGINES, PROFILE_DIR, EXPECTED_BUILD and TRACE=1 configure the run.

Behavior artifacts are under /tmp/companion-checks; gesture traces are /tmp/companion-handoff-<engine>.json. Playwright WebKit is not installed Safari. The earlier checks missed recoverable console warnings and did not test page scrolling before lightbox opening; those pass reports were insufficient.

Final delayed-module run on 43a3fb975: Chrome and Firefox passed the full check. Desktop and mobile WebKit passed loop readiness, morph duration, opening, navigation, previews and restored page scrolling, but failed the React 421 console-error assertion. These are failed test runs, not full passes. The wheel-handoff regression test also supports WHEEL_DELTA=-100 for the reverse direction.
