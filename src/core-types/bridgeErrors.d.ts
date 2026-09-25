import type { BridgeLogger } from "./logger.js";
export type BridgeToolTextResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError: true;
};
export declare function scratchpadFolderNotFoundResult(requestedFolder: string): BridgeToolTextResult;
/**
 * Standard error-result shape for a failed tool call: logs the failure, special-cases
 * `ScratchpadFolderError` with the fixed remediation text, otherwise returns the
 * concrete error message. Never swallows the cause.
 */
export declare function bridgeToolErrorResult(tool: string, error: unknown, logger: BridgeLogger): Promise<BridgeToolTextResult>;
