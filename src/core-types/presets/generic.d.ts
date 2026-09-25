import type { MaterializedResult } from "../mediaMaterializer.js";
import type { McpResultPreset, ResultTier } from "./types.js";
export declare const genericPreset: McpResultPreset;
/**
 * Generic, client-agnostic tool result: an inline base64 preview image per result, the tool's
 * own summary JSON forwarded verbatim, and a one-line usage hint whose wording reflects `tier`
 * ("final result" vs. "intermediate/working file"). No HTML report, no host-specific tool-chaining
 * instructions.
 *
 * `originalLinksFor` builds the http(s)/file:// link line(s) for one result — kept as a
 * caller-supplied callback because building those links requires draw-things-chat-core's
 * getHealthyServerBaseUrl()/toHttpOriginalUrl(), a dependency made-for-bionic-core deliberately
 * does not have (see bionic-mcp-architecture.md).
 */
export declare function buildGenericResultContent(toolLabel: string, tier: ResultTier, scratchpadPath: string, results: MaterializedResult[], summaryText: string | undefined, originalLinksFor: (result: MaterializedResult) => string[]): Promise<{
    content: unknown[];
}>;
