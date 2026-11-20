# Source of truth and Git

- Treat the code files in the Framer Kit Framer project (https://framer.com/projects/Framer-Kit--BqMZT7zRSjeufHHfMQHE-8MaFD) as the source code.
- Framer's `Kit/` folder mirrors to `src/` here, and Framer's `Framer_Kit/` wrappers mirror to `Framer_Kit/`.
- Apply every change made in those Framer code files to the local copy of this project as well.
- Automatically commit each change to Git after syncing the local copy. Never commit secrets.


# Framer integration tests and publishing

- Validate carousel and lightbox behavior against the actual published Framer Kit project in real browsers, not local fixtures or mocked Framer APIs. Local unit tests are supplemental.
- The user authorizes publishing this Framer project as often as needed for implementation and testing, without asking again. Publish current changes before validating them on the published site.
- Run `pnpm test:framer` for published-project integration checks in desktop WebKit and mobile WebKit. `pnpm test:collector` runs parser unit tests followed by those real-project checks.
- Default test site: https://adaptable-squash-368743.framer.app (override with `FRAMER_SITE_URL`). Project: https://framer.com/projects/Framer-Kit--BqMZT7zRSjeufHHfMQHE-8MaFD.
- Existing test routes include `/carousel/default`, `/carousel/edge-space-off`, `/carousel/loop-off`, `/carousel/group-loop-test`, and `/cms/default`. The user also authorizes creating test pages in this project when needed.
- Distinguish published runtime tests from Framer editor-canvas checks; do not claim that published-site tests validate canvas-only behavior or that Playwright WebKit is the installed Safari application.
