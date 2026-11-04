---
"@kniff/framer-kit": patch
---

Avoid measuring slide geometry during scroll-snap navigation availability checks. Looping carousels skip scroll-driven availability frames, while finite carousels reuse snap positions until layout or content changes.
