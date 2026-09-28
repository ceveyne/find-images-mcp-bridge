import type { BridgeLogger } from "./logger.js";
import type { McpResultPreset } from "./presets/types.js";
export type BridgeToolTextResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError: true;
};
/**
 * How to actually obtain a valid scratchpadFolder value — differs per preset (unsloth has no
 * get_scratchpad_folder tool, see made-for-preset-rollout-plan.md). Exported so each bridge's own
 * scratchpadResolution.ts/scratchpad.ts can reuse the exact same wording for the "scratchpadFolder
 * was omitted entirely" case, instead of duplicating bionic-only text 4 times.
 */
export declare function scratchpadFolderRemediation(preset?: McpResultPreset): string;
export declare function scratchpadFolderNotFoundResult(requestedFolder: string, preset?: McpResultPreset): BridgeToolTextResult;
/**
 * Standard error-result shape for a failed tool call: logs the failure, special-cases
 * `ScratchpadFolderError` with preset-appropriate remediation text, otherwise returns the
 * concrete error message. Never swallows the cause.
 */
export declare function bridgeToolErrorResult(tool: string, error: unknown, logger: BridgeLogger, preset?: McpResultPreset): Promise<BridgeToolTextResult>;
