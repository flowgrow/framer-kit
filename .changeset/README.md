# Changesets

Use changesets to describe user-visible changes while developing. A production release consumes the pending changesets, records the result in `CHANGELOG.md`, increments `package.json`, and deploys the local build directly to the Worker. Do not publish to npm.
