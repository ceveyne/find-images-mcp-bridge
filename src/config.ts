import { optionalEnv, resolveMadeForEnv, type McpResultPreset } from "./core-bundle.mjs";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type BridgeConfig = {
  chatWorkingDirectories: string;
  /** The preset resolved from MCP_MADE_FOR_BIONIC (primary, documented) or MCP_MADE_FOR (reserved for a future third preset) — see made-for-bionic-core's presets/index.ts. */
  preset: McpResultPreset;
  indexerUrl: URL;
  indexerToken: string;
  indexerCaCertificatePath?: string;
  /** Path to Unsloth Studio's local chat database (only read by the unsloth preset's beforeToolCall hook). */
  clientDbLocation: string;
};

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

/**
 * CHAT_WORKING_DIRECTORIES has no single universal default — each client points its scratchpads
 * somewhere different (bionic: LM Studio's own scratchpads root; unsloth: its sandbox dir under
 * studio's own data folder). generic has no default at all — an unknown client can't be assumed
 * to use either convention, so it stays a required setting there.
 */
function defaultChatWorkingDirectories(preset: McpResultPreset): string | undefined {
  if (preset.name === "bionic") return path.join(os.homedir(), ".lmstudio", "scratchpads");
  if (preset.name === "unsloth") return path.join(os.homedir(), ".unsloth", "studio", "sandbox");
  return undefined;
}

/**
 * Only applied when the file actually exists — unlike the other defaults above, silently
 * defaulting this to a path that doesn't exist would crash `RemoteIndexerClient` at startup
 * (`fs.readFileSync` on a missing cert), turning "no custom CA configured" (the common case)
 * into a hard failure. An explicitly-set FIND_IMAGES_MCP_INDEXER_CA_CERT is never guarded this
 * way — a bad explicit path is the user's own misconfiguration, not this default's problem.
 */
function defaultIndexerCaCertificatePath(): string | undefined {
  const candidate = path.join(os.homedir(), ".find-images", "server", "server.crt");
  return existsSync(candidate) ? candidate : undefined;
}

export function readBridgeConfig(): BridgeConfig {
  const preset = resolveMadeForEnv(optionalEnv("MCP_MADE_FOR"), optionalEnv("MCP_MADE_FOR_BIONIC"));
  const chatWorkingDirectories = optionalEnv("CHAT_WORKING_DIRECTORIES") ?? defaultChatWorkingDirectories(preset);
  if (!chatWorkingDirectories) throw new Error("CHAT_WORKING_DIRECTORIES must be configured.");
  const indexerUrl = new URL(optionalEnv("FIND_IMAGES_MCP_INDEXER_URL") ?? "https://127.0.0.1:9760/mcp");
  const indexerToken = requiredSetting("FIND_IMAGES_MCP_INDEXER_TOKEN");
  const indexerCaCertificatePath = optionalEnv("FIND_IMAGES_MCP_INDEXER_CA_CERT") ?? defaultIndexerCaCertificatePath();
  const clientDbLocation = optionalEnv("CLIENT_DB_LOCATION") ?? path.join(os.homedir(), ".unsloth", "studio", "studio.db");
  return { chatWorkingDirectories, preset, indexerUrl, indexerToken, indexerCaCertificatePath, clientDbLocation };
}