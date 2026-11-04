---
"@kniff/framer-kit": minor
---

Add optional continuous scroll-snap Auto Move with pixel-per-second speed and left/right direction controls. Pause for native touch/momentum, wheel, keyboard and arrow navigation; settle to a snap point and resume after 300ms. Wrap loop cycles during motion, stop at finite edges, honor reduced motion and background visibility, and clean up listeners, timers and inline styles.

Restore snapping with smooth behavior during touch/desktop scroll handoff and preserve the last automatic write when wheel events arrive after compositor scrolling. Avoid overriding native proximity snapping with a forced nearest-slide correction.

Gate Auto Move with IntersectionObserver so offscreen carousels do not animate or restart; resume without catch-up and preserve interaction pauses.

Preserve native scroll snapping after wheel, keyboard and navigation input while reduced motion disables Auto Move.
