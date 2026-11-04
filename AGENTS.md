# Production releases

- Every production push must increment the package release version. Never deploy unreleased source as a production build or reuse a release version for changed code.
- Do not publish releases to npm. npm is no longer used for this project’s releases; deploy directly to the production Worker/CDN.
- Create the Git release tag, add the version to `worker/releases.json`, and deploy the local build with `pnpm run worker:deploy`. Preserve historical assets from the live CDN; never require an npm publication or download release tarballs.
- Production Framer imports must pin a semantic release URL such as `https://framer-kit.kniff.at/0.5.2/index.js?external=react,react-dom,framer&target=es2022`. Do not use `/builds/<hash>/` URLs for production imports.
- When updating production, update the imports in both the Framer Kit and Jubilant Listening projects and verify their published pages. Preserve the user's button edits.
- Keep historical release and build URLs available for existing consumers.
