---
"@kniff/framer-kit": minor
---

Replace DOM loop cloning and forwarded clicks with React.cloneElement copies rendered by withKniffCarousel on the overflow viewport. Each repeated set owns its Ramka scope so morphs use the clicked copy, while preserving one logical set of images, React handlers, and live props. Looping now requires the viewport override. Keep the viewport stationary until the closing morph completes.
