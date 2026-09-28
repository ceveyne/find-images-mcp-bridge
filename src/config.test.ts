import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readBridgeConfig } from "./config.js";

const ENV_KEYS = [
  "CHAT_WORKING_DIRECTORIES",
  "MCP_MADE_FOR",
  "MCP_MADE_FOR_BIONIC",
  "FIND_IMAGES_MCP_INDEXER_URL",
  "FIND_IMAGES_MCP_INDEXER_TOKEN",
  "FIND_IMAGES_MCP_INDEXER_CA_CERT",
  "CLIENT_DB_LOCATION",
] as const;

function withEnv(overrides: Record<string, string | undefined>, run: () => void): void {
  const before = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.FIND_IMAGES_MCP_INDEXER_TOKEN = "test-token";
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("readBridgeConfig defaults CHAT_WORKING_DIRECTORIES to ~/.lmstudio/scratchpads for the bionic preset (the default)", () => {
  withEnv({}, () => {
    const config = readBridgeConfig();
    assert.equal(config.chatWorkingDirectories, path.join(os.homedir(), ".lmstudio", "scratchpads"));
  });
});

test("readBridgeConfig defaults CHAT_WORKING_DIRECTORIES to ~/.unsloth/studio/sandbox for the unsloth preset", () => {
  withEnv({ MCP_MADE_FOR: "unsloth" }, () => {
    const config = readBridgeConfig();
    assert.equal(config.chatWorkingDirectories, path.join(os.homedir(), ".unsloth", "studio", "sandbox"));
  });
});

test("readBridgeConfig has no CHAT_WORKING_DIRECTORIES default for the generic preset — it stays required", () => {
  withEnv({ MCP_MADE_FOR: "generic" }, () => {
    assert.throws(() => readBridgeConfig(), /CHAT_WORKING_DIRECTORIES must be configured/);
  });
});

test("readBridgeConfig defaults FIND_IMAGES_MCP_INDEXER_URL to the local indexer", () => {
  withEnv({}, () => {
    const config = readBridgeConfig();
    assert.equal(config.indexerUrl.href, "https://127.0.0.1:9760/mcp");
  });
});

test("readBridgeConfig requires FIND_IMAGES_MCP_INDEXER_TOKEN with no default", () => {
  withEnv({ FIND_IMAGES_MCP_INDEXER_TOKEN: "" }, () => {
    assert.throws(() => readBridgeConfig(), /FIND_IMAGES_MCP_INDEXER_TOKEN must be configured/);
  });
});

test("readBridgeConfig defaults CLIENT_DB_LOCATION to Unsloth Studio's own database path", () => {
  withEnv({}, () => {
    const config = readBridgeConfig();
    assert.equal(config.clientDbLocation, path.join(os.homedir(), ".unsloth", "studio", "studio.db"));
  });
});
