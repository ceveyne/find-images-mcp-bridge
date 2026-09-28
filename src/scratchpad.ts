/**
 * Thin re-export of made-for-bionic-core's scratchpad/media-state mechanics, wired to
 * this bridge's own logger. The actual implementation lives in made-for-bionic-core so
 * it can be shared with other bridges (e.g. the planned generate-image MCP adapter).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { logBridgeEvent, logBridgeError } from "./bridgeLogger.js";
import { ensureMediaState, resolveScratchpadFolder as coreResolveScratchpadFolder } from "./core-bundle.mjs";

export { ScratchpadFolderError, readMediaState, writeMediaState, type MediaRecord, type MediaState } from "./core-bundle.mjs";

const logger = { logEvent: logBridgeEvent, logError: logBridgeError };

export async function resolveScratchpadFolder(baseDirectory: string, requestedFolder: string): Promise<string> {
  return coreResolveScratchpadFolder(baseDirectory, requestedFolder, logger);
}

/**
 * scratchpadFolder is optional only for the generic preset (falls back to
 * chatWorkingDirectories itself when omitted). The bionic preset requires an
 * explicit scratchpadFolder — pass requireFolder=true there — mirrors
 * process-image/analyse-image's own src/mcp/scratchpadResolution.ts.
 */
export async function resolveEffectiveScratchpadPath(chatWorkingDirectories: string, requestedFolder: string | undefined, requireFolder = false): Promise<string> {
  const requested = typeof requestedFolder === "string" ? requestedFolder.trim() : "";
  if (requested) {
    return resolveScratchpadFolder(chatWorkingDirectories, requested);
  }
  if (requireFolder) {
    throw new Error("scratchpadFolder is required (MCP_MADE_FOR=bionic, the default). Call get_scratchpad_folder and pass its return value unchanged.");
  }
  const basePath = path.resolve(chatWorkingDirectories);
  let stats;
  try {
    stats = await fs.stat(basePath);
  } catch (error) {
    throw new Error(`CHAT_WORKING_DIRECTORIES is not accessible: ${basePath} (${error instanceof Error ? error.message : String(error)})`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`CHAT_WORKING_DIRECTORIES is not a directory: ${basePath}`);
  }
  await ensureMediaState(basePath);
  return basePath;
}
