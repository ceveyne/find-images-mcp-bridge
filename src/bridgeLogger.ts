import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridgeLogger } from "./core-bundle.mjs";

const BRIDGE_LOG_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "logs", "find-images-mcp-bridge.log");

const logger = createBridgeLogger(BRIDGE_LOG_PATH);

export const logBridgeEvent = logger.logEvent.bind(logger);
export const logBridgeError = logger.logError.bind(logger);
export { BRIDGE_LOG_PATH };
