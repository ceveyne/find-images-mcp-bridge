/**
 * Single source of truth for how EVERY Bionic stdio-MCP bridge must branch its tool result
 * on whether it's talking to Bionic itself or a generic MCP client.
 *
 * Bridges must read the universal MCP_MADE_FOR_BIONIC env var via resolveBridgePreviewPolicyFromEnv()
 * (or parseMadeForBionicEnv() + resolveBridgePreviewPolicy() if they need the raw boolean too) and
 * drive their result-building / scratchpadFolder-validation off the returned flags, instead of
 * inventing a bridge-prefixed env var (e.g. the old, now-removed `GENERATE_IMAGE_PREVIEW_IN_CHAT`)
 * or re-deriving these three rules ad-hoc in their own index.ts/toolResults.ts. That way, if
 * Bionic's own capabilities change in the future (e.g. it starts consuming inline base64 previews
 * directly), every bridge picks up the new behavior by changing ONE function, here, instead of
 * hunting down scattered `if (madeForBionic)` checks in each bridge's own repo.
 *
 * The actual result TEXT (tool-chaining instructions, field names, etc.) stays bridge-specific
 * — this module only decides WHICH shape applies, not what it looks like.
 */
export interface BridgePreviewPolicy {
    /** Inline base64 preview image content block(s) in the tool result. */
    includeBase64Preview: boolean;
    /** An HTML report file, written only when there are 2+ results (never for exactly 1). */
    writeHtmlReportForMultipleResults: boolean;
    /** Whether the bridge's scratchpadFolder argument must be supplied by the caller. */
    scratchpadFolderRequired: boolean;
}
/**
 * madeForBionic=true (the default): Bionic-guided tool-chaining result, an HTML report for 2+
 * results, a required scratchpadFolder (its own per-session folder, not the shared root).
 *
 * madeForBionic=false (generic MCP clients): inline base64 preview(s), no HTML report ever,
 * scratchpadFolder optional (falls back to the bridge's configured base working directory).
 */
export declare function resolveBridgePreviewPolicy(madeForBionic: boolean): BridgePreviewPolicy;
/**
 * The ONE env var name every Bionic MCP bridge must read for this setting — never a
 * bridge-prefixed variant. Boolean, default `true` (Bionic tool-chaining path).
 */
export declare const MADE_FOR_BIONIC_ENV_VAR = "MCP_MADE_FOR_BIONIC";
/**
 * Parses a raw MCP_MADE_FOR_BIONIC value (e.g. `process.env.MCP_MADE_FOR_BIONIC`). Unset or
 * blank defaults to `true`. Accepts `1`/`true`/`yes` (case-insensitive) as true; anything else
 * (including `0`/`false`/`no`) is false.
 */
export declare function parseMadeForBionicEnv(rawValue: string | undefined): boolean;
/** One-call convenience: parses MCP_MADE_FOR_BIONIC and resolves the BridgePreviewPolicy in one step. */
export declare function resolveBridgePreviewPolicyFromEnv(rawMadeForBionic: string | undefined): BridgePreviewPolicy;
