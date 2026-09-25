/**
 * Type declarations for the core bundle.
 *
 * made-for-bionic-core has no git remote, so this repo carries its own committed copy of
 * the declarations (src/core-types/, synced by scripts/sync-core.mjs) instead of resolving
 * types through a `file:` dependency — a fresh clone of this repo alone must never need the
 * sibling made-for-bionic-core checkout. The runtime module is the copied core-bundle.mjs.
 */
export * from "./core-types/index.js";
