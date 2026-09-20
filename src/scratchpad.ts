/**
 * Thin re-export of made-for-bionic-core's scratchpad/media-state mechanics, wired to
 * this bridge's own logger. The actual implementation lives in made-for-bionic-core so
 * it can be shared with other bridges (e.g. the planned generate-image MCP adapter).
 */
import { logBridgeEvent, logBridgeError } from "./bridgeLogger.js";
import { resolveScratchpadFolder as coreResolveScratchpadFolder } from "./core-bundle.mjs";

export { ScratchpadFolderError, readMediaState, writeMediaState, type MediaRecord, type MediaState } from "./core-bundle.mjs";

const logger = { logEvent: logBridgeEvent, logError: logBridgeError };

export async function resolveScratchpadFolder(baseDirectory: string, requestedFolder: string): Promise<string> {
  return coreResolveScratchpadFolder(baseDirectory, requestedFolder, logger);
}
