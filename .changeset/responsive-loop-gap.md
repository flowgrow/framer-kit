---
"@kniff/framer-kit": patch
---

Mirror responsive Framer stack gaps across the Embla loop seam, prevent
thumbnail synchronization from overriding wrapped navigation, and center the
fallback counters and pagination dots. Position the generated viewport so
Embla measures the container and its slides in the same coordinate system,
including the generated final-slide margin in its loop distance. Remove the
overflow control from Carousel Settings and leave the added Embla viewport
visible so the overridden Framer stack owns clipping. Apply the seam margin
before initializing Embla and defer that initialization until Framer's
responsive stack geometry has settled. Use Embla's root node as the
authoritative viewport for later responsive measurements.
