# Production releases

- Every production push must increment the package release version. Never deploy unreleased source as a production build or reuse a release version for changed code.
- Publish the new npm release and Git tag, add that version to `worker/releases.json`, then deploy with `pnpm run worker:deploy`.
- Production Framer imports must pin a semantic release URL such as `https://framer-kit.kniff.at/0.5.2/index.js?external=react,react-dom,framer&target=es2022`. Do not use `/builds/<hash>/` URLs for production imports.
- When updating production, update the imports in both the Framer Kit and Jubilant Listening projects and verify their published pages. Preserve the user's button edits.
- Keep historical release and build URLs available for existing consumers.
