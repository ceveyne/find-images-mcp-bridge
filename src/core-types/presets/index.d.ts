import type { McpResultPreset } from "./types.js";
export * from "./types.js";
export * from "./bionic.js";
export * from "./generic.js";
/**
 * Reserved for a future third+ preset (e.g. "unsloth", "claude") — NOT yet the primary,
 * documented selector for any bridge. MCP_MADE_FOR_BIONIC (boolean) remains the primary,
 * supported way to choose between "bionic"/"generic" until a third preset is actually needed
 * (see bionic-mcp-architecture.md, "Ergebnis-Praesentation: Preset-Architektur").
 */
export declare const MADE_FOR_ENV_VAR = "MCP_MADE_FOR";
/** Unknown/empty name falls back to "bionic", never silently to "generic". */
export declare function resolvePreset(name: string | undefined): McpResultPreset;
/**
 * MCP_MADE_FOR_BIONIC (boolean: "true" -> "bionic", "false" -> "generic") is the primary,
 * currently supported selector. MCP_MADE_FOR (preset name) takes precedence when a bridge
 * explicitly sets it, but is not yet documented/promoted for users — it exists so a future
 * third preset doesn't require another migration.
 */
export declare function resolveMadeForEnv(madeForRaw: string | undefined, madeForBionicRaw: string | undefined): McpResultPreset;
