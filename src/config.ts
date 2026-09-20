export type BridgeConfig = {
  chatWorkingDirectories: string;
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
  const indexerUrl = new URL(requiredSetting("FIND_IMAGES_MCP_INDEXER_URL"));
  const indexerToken = requiredSetting("FIND_IMAGES_MCP_INDEXER_TOKEN");
  const indexerCaCertificatePath = process.env.FIND_IMAGES_MCP_INDEXER_CA_CERT?.trim() || undefined;
  return { chatWorkingDirectories, indexerUrl, indexerToken, indexerCaCertificatePath };
}