# Companion branch runtime copies

Framer project: https://framer.com/projects/The-Companion--s8t6yE6lekXltgaL4N73-jdLHQ?branch=y0f6w208o

Published branch: https://philosophical-portion-666222--new-carousel-y0f6w208o.framer.app

`CompanionLocal/` mirrors the branch's code files. The 34 files were copied from the live Framer Kit project, retaining its relative dependency graph. The carousel touch-intent import now resolves locally. Ramka remains the existing external @ramka/react 0.0.2 dependency.

The homepage uses local Overrides.tsx exports and local settings components. Existing slide layers, button components, images, and settings values are preserved. Other pages retain their existing references.

Homepage settings instance replacements:

| Original | Local | Purpose |
| --- | --- | --- |
| yfMICjaux | xNUKA_k7b | Photo lightbox settings |
| NgGvyUR5k | lDGxmgxY1 | Photo carousel settings |
| RSt_3XQtN | lms6kQNqz | Events carousel settings |

The published runtime exposes `window.__COMPANION_KIT_BUILD__ = "companion-local-2026-11-18-v1"`. Update the marker when changing the copied implementation and assert it before profiling.

Iteration: edit the branch code, mirror it here and commit, publish the branch, reload and verify the marker, then test opening and navigation. No Assets Update step is required for these homepage copies. Apply verified performance fixes back to the Kit source separately.

Framer initially compiled files before their dependencies existed. Recompiling all copies after creation resolved stale missing-module references. All 34 writes returned empty code diagnostics afterward.

Verified on branch deployment `0e06375b4`: marker present, popup absent, ten original photo triggers, opening, keyboard next/previous (0 → 1 → 0), main image sizes 100vw, and ratio-aware thumbnail sizes (about 96px landscape / 72px portrait). A tree audit found 95 local override references and 15 local settings instances across five breakpoints, with zero former Kit references of those types on the homepage. This verifies isolation and basic behavior, not a Safari performance improvement.
