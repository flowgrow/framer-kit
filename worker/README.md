# Production module CDN

Cloudflare Worker: `framer-kit-prod` on `framer-kit.kniff.at`.
The Worker serves prebuilt ESM; it never installs packages or bundles React on a request.

Published npm versions are immutable:

```tsx
import { VisibleScrollOverflowSettings } from "https://framer-kit.kniff.at/@kniff/framer-kit@0.5.2/scroll-snap?external=react,react-dom,framer&target=es2022"
```

`/0.5.2/index.js`, `/0.5.2/ramka.js`, and `/0.5.2/scroll-snap.js` are canonical
entry URLs. Versioned files exactly match the npm tarball, verified using its
SHA-512 integrity value before deployment.

`/index.js`, `/ramka.js`, and `/scroll-snap.js` point to the latest published npm release. Production adapters pin the semantic version, never a `/builds/<hash>/` URL. Historical build URLs remain available for existing consumers.

React, React DOM (including their subpaths), and Framer always remain bare host
imports. `external=react,react-dom,framer` and `external=*` are accepted; requesting
a subset does not bundle the other host dependencies. The only supported target
is `es2022`; unsupported transformations such as `bundle` fail with HTTP 400.
Modules and declarations have CORS headers. Versioned and hashed files are
immutable; the unversioned aliases revalidate.

## Update and deploy

Every production push must increment the release version:

1. Add a changeset and run `pnpm run version-packages` to increment the package version and changelog.
2. Merge the release to `main`; wait for GitHub Actions to publish npm and create the Git release tag.
3. Add the new version to `worker/releases.json`, then run `pnpm run worker:deploy`.
4. Update production imports in both the Framer Kit and Jubilant Listening projects to the new semantic release URL. Publish and verify both sites.

The deployment guard rejects unchanged or older versions and unpublished packages. Preparation downloads exact npm tarballs, verifies integrity, and retains all historical assets. Never redeploy changed source under an existing release version. Use the development tunnel for unreleased code.

The live verification script traverses the actual ESM import graph, checks CORS
and MIME types, verifies that host dependencies stay external, and checks
preflight, HEAD, and unsupported-option responses. Wrangler credentials stay in
its local credential store; none are needed in the Worker runtime or repository.
