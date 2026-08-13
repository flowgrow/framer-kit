import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core/index.ts",
    hooks: "src/hooks/index.ts",
    components: "src/components/index.ts",
    overrides: "src/overrides/index.ts",
    embla: "src/embla/index.ts",
    schema: "src/schema/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  platform: "browser",
  dts: true,
  splitting: true,
  treeshake: true,
  sourcemap: true,
  clean: true,
  external: ["framer", "react", "react-dom", "react/jsx-runtime"],
  // Bundle every installed runtime package for Framer. Only the host-provided
  // packages listed above remain external.
  noExternal: [/^(?!(?:framer|react|react-dom)(?:\/|$)).+/],
})
