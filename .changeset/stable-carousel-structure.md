---
"@kniff/framer-kit": patch
---

Render named carousel structure and slide styles during SSR to avoid remounting Framer/CMS content when settings register after hydration. Prevent style-text hydration mismatches caused by Framer CSS minification.

Reserve configured carousel layout while hiding its content until Embla has applied its initial snap, preventing the first slide flashing at the left before initialization.
