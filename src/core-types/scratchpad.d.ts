import type { BridgeLogger } from "./logger.js";
export declare class ScratchpadFolderError extends Error {
    requestedFolder?: string;
}
/**
 * Validates a Bionic-supplied `scratchpadFolder` argument against the configured
 * scratchpad root and ensures `chat_media_state.json` exists in it.
 *
 * The folder must already exist — it is never created. `logger` is optional so this
 * module has no hard dependency on any specific bridge's log file location.
 */
export declare function resolveScratchpadFolder(baseDirectory: string, requestedFolder: string, logger?: BridgeLogger): Promise<string>;
