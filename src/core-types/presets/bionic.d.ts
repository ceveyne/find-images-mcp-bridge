import type { MaterializedResult } from "../mediaMaterializer.js";
import type { McpResultPreset, ResultTier } from "./types.js";
export declare const bionicPreset: McpResultPreset;
/**
 * Bionic-guided result text, following the same report-open -> agent-verify -> user-display
 * -> follow-up-handle pattern as find-images-mcp-bridge's findImageToolResult() (see
 * planning/bionic-mcp-architecture.md, "Resultatgesteuerte Agentenführung").
 *
 * Used only for 2+ results — see buildSingleResultText() for the single-result case, which
 * skips the HTML report entirely.
 */
export declare function buildMultiResultText(toolLabel: string, tier: ResultTier, reportPath: string, results: MaterializedResult[]): string;
/**
 * Single-result variant: no HTML report is written or referenced. The in-app browser opens the
 * generated file's own preview directly, and metadata is inlined 1:1 from the tool call's own
 * summary object instead of pointing at a report file.
 */
export declare function buildSingleResultText(toolLabel: string, tier: ResultTier, result: MaterializedResult, summary: Record<string, unknown> | undefined): string;
