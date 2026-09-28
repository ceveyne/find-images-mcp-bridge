import { optionalEnv, resolveMadeForEnv, type McpResultPreset } from "./core-bundle.mjs";

export type BridgeConfig = {
  chatWorkingDirectories: string;
  /** The preset resolved from MCP_MADE_FOR_BIONIC (primary, documented) or MCP_MADE_FOR (reserved for a future third preset) — see made-for-bionic-core's presets/index.ts. */
  preset: McpResultPreset;
  indexerUrl: URL;
  indexerToken: string;
  indexerCaCertificatePath?: string;
};

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

export function readBridgeConfig(): BridgeConfig {
  const chatWorkingDirectories = requiredSetting("CHAT_WORKING_DIRECTORIES");
  const preset = resolveMadeForEnv(optionalEnv("MCP_MADE_FOR"), optionalEnv("MCP_MADE_FOR_BIONIC"));
  const indexerUrl = new URL(requiredSetting("FIND_IMAGES_MCP_INDEXER_URL"));
  const indexerToken = requiredSetting("FIND_IMAGES_MCP_INDEXER_TOKEN");
  const indexerCaCertificatePath = process.env.FIND_IMAGES_MCP_INDEXER_CA_CERT?.trim() || undefined;
  return { chatWorkingDirectories, preset, indexerUrl, indexerToken, indexerCaCertificatePath };
}