# Continuous scroll-snap movement

Auto Move is optional on VisibleScrollOverflowSettings. Speed defaults to 30px/s;
Direction defaults to Left. The demo enables it; new instances default to off.

The controller accumulates fractional scroll distance using requestAnimationFrame
elapsed time. It caches snap and loop geometry on setup, resize, and slide changes,
so the movement loop performs no slide measurements. Long frame deltas are capped
at 50ms to prevent a visible catch-up jump. Finite carousels stop at their edge.
Looping carousels wrap to the equivalent position in the original cycle.

Touch tap down cancels movement and restores CSS snapping synchronously. Touchstart
also preserves native snapping; native touch scrolling retains momentum. There is
no custom mouse dragging. Without a touch interface, wheel/keyboard intent stops
the animation without restoring snapping yet; the first scroll event that differs
from Auto Move's last written scroll position restores it. Auto Move's own scroll
events cannot trigger the handoff. Scrollbar scrolling is detected the same way.
After scrolling becomes idle, the controller checks the nearest start/center/end
snap point and smoothly settles if necessary, then holds for 300ms before restarting.
Pointer cancellation does not release an active touch.
Wheel, keyboard, and navigation buttons use the same interruption path.

Reduced motion disables automatic movement. Background tabs pause. Cleanup cancels
frames/timers, removes listeners/observers, and restores prior inline styles. Loop
initialization signals readiness before Auto Move starts so its snap restoration
cannot overwrite the controller's settings. The ordinary loop normalizer yields
while the controller owns movement.

## Validation, 24 October 2026

- `pnpm run check`: TypeScript, 46 unit tests, ESM and declaration build pass.
- Playwright Chromium, Firefox, desktop WebKit, mobile WebKit: 35 checks pass;
  one mouse-specific check is intentionally skipped for the mobile profile.
- Tests cover 30px/s movement, bounded frame steps, forward/reverse loop wrapping,
  all three alignments, mouse dragging, held touch and pointercancel, wheel,
  restart hold, finite edges, reduced motion, cleanup, and the React settings
  component with cloning and padding synchronization.
- Actual iPhone 16e simulator, iOS 26.0 Safari remote inspector: 600-frame sample
  at 30px/s measured 30.049px/s, maximum scroll step 1px. Interaction timeline
  showed settling, a 301ms stationary hold, then resumed movement. The simulator
  had an isolated 101ms frame interval under inspection; no catch-up jump followed.
  These measurements are not a guarantee against stalls caused by other page work.
- Framer code typechecks. Production deployment: 6987c2e7e. Reloading the simulator
  verified no injected test controller, loop-ready=true, Auto Move running. A clean
  600-frame sample measured exactly 30px/s; a simulator gesture produced held →
  settling → waiting (300ms at scrollLeft 6636) → running.

The package keeps the controller in autoMove.ts. The Framer code file embeds that
same controller in LoopScrollOverflow.tsx because Framer's code-file typechecker
could not resolve the helper's relative import. Keep that embedded copy synchronized
when updating the controller. No dependency changes are required.

## Touch/desktop handoff update, 25 October 2026

Removed custom mouse dragging. Touch tap down restores snapping immediately;
desktop wheel/keyboard intent stops Auto Move and the first changed scroll event
restores snapping. Last-written-position tracking excludes Auto Move's own scroll
events. The updated suite passes 42 browser checks, with two desktop-only checks
skipped on the mobile profile. Typecheck, 46 unit tests, and build pass. Saved in
Framer, but the publish preview currently reports 34 unrelated page errors.


## Smoother native handoff

Keep the last Auto Move write as the comparison baseline when wheel intent arrives:
a compositor may have moved scrollLeft before the wheel event is dispatched.
Re-reading the baseline inside wheel can swallow the first scroll event. Native
handoff now sets scroll-behavior to smooth before restoring scroll-snap-type,
which prevents an instant re-snap on restoration. Once native scrolling settles,
proximity snapping is left to the browser; a mandatory alignment correction runs
only if the idle position still misses a snap point (needed on WebKit). Regression
tests cover compositor-before-wheel event ordering and real browser wheel input.

The smoother-handoff regression suite passes 48 checks across Chromium, Firefox,
desktop WebKit and mobile WebKit; four desktop-only wheel checks are skipped on
mobile. Typecheck, 46 unit tests, build, and Framer code typechecking pass. Publishing
remains blocked by the unrelated project-wide errors noted above.


## Viewport visibility gating

An IntersectionObserver gates startup and continuous movement. A positive visible
intersection is required, including clipping by scrollable ancestors. Offscreen
carousels cancel their animation frame and resume timer without restoring snapping
and shifting the paused position. Previously moving carousels resume from that
position on return, with the frame timestamp reset so hidden time is not added.
Interrupted carousels finish settling and the restart delay instead; held touches
remain paused. Document visibility and reduced-motion checks still apply. Cleanup
disconnects the observer. Thresholds include a small positive boundary so an edge
contact with zero visible area cannot leave the carousel stuck when it enters.

Visibility-gating validation: 60 browser checks pass across Chromium, Firefox,
desktop WebKit and mobile WebKit (four desktop-only checks skipped on mobile).
Coverage includes initial offscreen mounting, repeated exit/re-entry without
catch-up movement, held touches across visibility changes, and clipping by a
scrollable parent. Typecheck, 46 unit tests, build and Framer typecheck pass. The
current Framer publish preview is blocked by errors on other pages; this
visibility update is saved but not deployed.

## Reduced-motion input fix

The interruption path now preserves native snapping and automatic scroll behavior
when reduced motion is active, clears pending automatic work, and returns without
entering the settle/restart path. Regression coverage checks wheel, keyboard and
navigation input, both when reduced motion is enabled at mount and when toggled
while Auto Move is running. All 12 targeted browser checks pass across Chromium,
Firefox and desktop/mobile WebKit; typecheck, 46 unit tests, build and Framer
code typecheck pass. Slide resize observation is unchanged.
