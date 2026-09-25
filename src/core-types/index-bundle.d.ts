/**
 * Bundle entry point for esbuild (see bundle.mjs). Identical to index.ts today; kept as
 * a separate entry so bundle-only exclusions can be introduced later without touching
 * the dev-time barrel that consumers' TypeScript resolves through `file:` dependencies.
 */
export * from "./index.js";
