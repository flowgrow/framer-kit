---
"@kniff/framer-kit": patch
---

Add the optional `selectOnSlideClick` Carousel Settings behavior, exposed in
Framer as **Click to Select**, to scroll the carousel to a clicked slide. When
the carousel is registered as thumbnails by `ThumbnailConnection`, route the
clicked slide index directly to the connected main carousel as recommended by
Embla's thumbnail pattern.
Slides also use a pointer cursor while the behavior is enabled.

Add a **Contain Edges** setting that maps to Embla's `containScroll`, allowing
edge slides to use normal alignment when disabled.
Synchronize thumbnail drag selection back to the connected main carousel while
mapping contained snap groups to their corresponding slide indices.
Forward thumbnail pointer interactions to the connected main carousel so its
autoplay or auto-scroll plugin honors **Stop on Interaction**.
Read modern Framer Slot controls as direct React nodes so connected counter,
navigation, and progress components render correctly. Counter replacements are
provided as strings so Framer Rich Text layers render their values.
Preserve single-child element structure while replacing nested text, which is
required by Framer's Rich Text renderer.
Add a **Scroll Updates Main** option to `ThumbnailConnection` so thumbnail
scrolling can be decoupled from main-carousel selection when desired.
Add an **Instructions** toggle to `ThumbnailConnection` for its Canvas-only
setup card; Preview and published output remain headless.
Use an invisible Canvas sentinel when instructions are disabled to suppress
Framer's automatic empty-component placeholder.
