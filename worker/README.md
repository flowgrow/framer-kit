# Production module CDN

Cloudflare Worker: `framer-kit-prod` on `framer-kit.kniff.at`.
The Worker serves prebuilt ESM; it never installs packages or bundles React on a request.

Published npm versions are immutable:

```tsx
import { VisibleScrollOverflowSettings } from "https://framer-kit.kniff.at/@kniff/framer-kit@0.5.1/scroll-snap?external=react,react-dom,framer&target=es2022"
```

`/0.5.1/index.js`, `/0.5.1/ramka.js`, and `/0.5.1/scroll-snap.js` are canonical
entry URLs. Versioned files exactly match the npm tarball, verified using its
SHA-512 integrity value before deployment.

`/index.js`, `/ramka.js`, and `/scroll-snap.js` point to the current working build.
For reproducible Framer imports, use the content-addressed `/builds/<hash>/...`
URLs reported by `/health` and recorded in `manifest.json`. These builds can
contain changes that have not been published to npm. Production adapters under
`examples/framer/prod` use those pinned build URLs.

React, React DOM (including their subpaths), and Framer always remain bare host
imports. `external=react,react-dom,framer` and `external=*` are accepted; requesting
a subset does not bundle the other host dependencies. The only supported target
is `es2022`; unsupported transformations such as `bundle` fail with HTTP 400.
Modules and declarations have CORS headers. Versioned and hashed files are
immutable; the unversioned aliases revalidate.

## Update and deploy

```sh
pnpm exec wrangler login
pnpm run worker:prepare
pnpm run typecheck
pnpm run test
pnpm exec wrangler deploy --config worker/wrangler.jsonc
pnpm run worker:verify
```

For a targeted stable rebuild, run `node scripts/prepare-worker.mjs --dist-dir /path/to/stable/dist` instead of `worker:prepare`, then deploy normally. This keeps experimental Dev changes out of Prod. The current stable build uses source commit `07213e4` with the “Kniff Lightbox Settings” canvas label and a pointer cursor on lightbox triggers.

To host a new npm release, add its exact version to `releases.json` before
preparing. Preparation retains previously deployed builds and versions from
the live CDN, so existing pinned URLs continue working. Do not delete history.
The very first deployment used `node scripts/prepare-worker.mjs --initial`;
that flag must not be used for normal updates.

The live verification script traverses the actual ESM import graph, checks CORS
and MIME types, verifies that host dependencies stay external, and checks
preflight, HEAD, and unsupported-option responses. Wrangler credentials stay in
its local credential store; none are needed in the Worker runtime or repository.
