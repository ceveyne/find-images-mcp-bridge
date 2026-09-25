/**
 * made-for-bionic-core — barrel export
 *
 * Shared, host-neutral mechanics for Bionic stdio-MCP bridges. Deliberately excludes
 * anything plugin-specific (remote clients, tool schemas, result-text phrasing) — see
 * planning/bionic-mcp-architecture.md in made-for-bionic for the scope rationale.
 */
export * from "./envConfig.js";
export * from "./logger.js";
export * from "./scratchpad.js";
export * from "./mediaState.js";
export * from "./htmlReport.js";
export * from "./bridgeErrors.js";
export * from "./bridgeServer.js";
export * from "./previewPolicy.js";
export * from "./mediaMaterializer.js";
export * from "./presets/index.js";
export * from "./sourceTargetResolution.js";
