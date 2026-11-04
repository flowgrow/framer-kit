---
"@kniff/framer-kit": patch
---

Interrupt Auto Move only after horizontal touch intent. Pending touches, vertical page gestures, and vertical wheel input leave continuous native scrolling running. Preserve snapping and momentum for horizontal input, and resume reliably at fractional loop boundaries.
