---
"@kniff/framer-kit": patch
---

Remove Ramka Loop, Morph Transition, Close Morph, and Pull to Close controls. Always disable lightbox looping, enable morph transitions and pull to close, and morph back to the active image. Ignore old saved values for these options. Respect the configured preload value instead of forcing at least two neighboring slides.

Rename lightbox overrides to `withKniffLightboxGallery` and `withKniffLightboxTrigger`, and the combined viewport override to `withKniffLightboxCarouselLoop`.
