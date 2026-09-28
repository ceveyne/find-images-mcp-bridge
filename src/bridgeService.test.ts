import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { buildGenericFindImageResult, materializeSearchResult, resolveRemoteTarget } from "./bridgeService.js";
import type { RemoteIndexerClient } from "./remoteIndexerClient.js";
import { readMediaState, resolveScratchpadFolder, writeMediaState } from "./scratchpad.js";

test("only a find_image pN record bypasses uploads", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    await resolveScratchpadFolder(baseDirectory, "8x");
    await fs.writeFile(path.join(scratchpadPath, "foreign.jpg"), "image");
    const state = await readMediaState(scratchpadPath);
    state.pictures.push(
      { p: 1, sourceUrl: "/index/known.jpg", preview: "known.jpg", sourceTool: "find_image" },
      { p: 2, sourceUrl: "/foreign/source.jpg", preview: "foreign.jpg", sourceTool: "brave-image-search" },
    );
    await writeMediaState(scratchpadPath, state);
    const uploads: string[] = [];
    const indexer = {
      uploadImage: async (imagePath: string) => {
        uploads.push(imagePath);
        return "https://indexer/uploads/up_1";
      },
    } as unknown as RemoteIndexerClient;

    assert.equal(await resolveRemoteTarget("p1", scratchpadPath, indexer), "/index/known.jpg");
    assert.equal(await resolveRemoteTarget("p2", scratchpadPath, indexer), "https://indexer/uploads/up_1");
    assert.deepEqual(uploads, [path.join(scratchpadPath, "foreign.jpg")]);
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("materialization preserves server rank, writes pN state, and escapes HTML metadata", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    await resolveScratchpadFolder(baseDirectory, "8x");
    const indexer = {
      downloadPreview: async () => Buffer.from("preview-bytes"),
    } as unknown as RemoteIndexerClient;
    const materialized = await materializeSearchResult({
      totalFound: 1,
      images: [{
        rank: 2,
        imagePaths: ["document-image-doc://guide.md#1"],
        httpPreviewUrls: ["https://indexer/previews/dl_8adea9f4/2/display_1024"],
        prompt: "<script>alert(1)</script>",
      }],
    }, scratchpadPath, indexer);

    assert.equal(materialized.queryId, "dl_8adea9f4");
    assert.deepEqual(materialized.ranks, [2]);
    assert.deepEqual(await fs.readFile(path.join(scratchpadPath, "preview-dl_8adea9f4-2.jpg")), Buffer.from("preview-bytes"));
    const state = await readMediaState(scratchpadPath);
    assert.deepEqual(state.pictures, [{ p: 1, sourceUrl: "document-image-doc://guide.md#1", preview: "preview-dl_8adea9f4-2.jpg", queryId: "dl_8adea9f4", rank: 2, sourceTool: "find_image", pluginId: "ceveyne/find-images-mcp-bridge" }]);
    const report = await fs.readFile(materialized.reportPath!, "utf8");
    assert.match(report, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("materialization preserves absolute content-directory source paths", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    const indexer = {
      downloadPreview: async () => Buffer.from("preview-bytes"),
    } as unknown as RemoteIndexerClient;
    const materialized = await materializeSearchResult({
      totalFound: 1,
      images: [{
        rank: 1,
        imagePaths: ["/Users/tester/Pictures/reference-image.png"],
        httpPreviewUrls: ["https://indexer/previews/dl_source_basename/1/display_1024"],
        sourceInfo: { type: "content_directory" },
      }],
    }, scratchpadPath, indexer);

    const state = await readMediaState(scratchpadPath);
    assert.equal(state.pictures[0]?.sourceUrl, "/Users/tester/Pictures/reference-image.png");
    const report = await fs.readFile(materialized.reportPath!, "utf8");
    assert.match(report, /content directory \(reference-image\.png\)/);
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("materialization identifies working-directory source types as LM Studio chats", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    await resolveScratchpadFolder(baseDirectory, "8x");
    const indexer = {
      downloadPreview: async () => Buffer.from("preview-bytes"),
    } as unknown as RemoteIndexerClient;
    const sourceTypes = ["attachment", "variant", "image", "picture"];
    const materialized = await materializeSearchResult({
      totalFound: sourceTypes.length,
      images: sourceTypes.map((type, index) => ({
        rank: index + 1,
        imagePaths: [`file:///working-directories/${index + 1}/image.png`],
        httpPreviewUrls: [`https://indexer/previews/dl_source/1/display_1024`],
        sourceInfo: { type, chatId: String(1773436830424 + index), originalName: "image.png" },
      })),
    }, scratchpadPath, indexer);

    const report = await fs.readFile(materialized.reportPath!, "utf8");
    for (const [index, type] of sourceTypes.entries()) {
      assert.match(report, new RegExp(`${type} \\(LM Studio chat ${1773436830424 + index}\\)`));
    }
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("a missing scratchpad folder is rejected without creating it", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    await assert.rejects(resolveScratchpadFolder(baseDirectory, "missing-session"), /scratchpad folder was not found/);
    await assert.rejects(fs.stat(path.join(baseDirectory, "missing-session")), { code: "ENOENT" });
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("aN attachment notation is rejected before the handler is ever invoked", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    await fs.mkdir(path.join(baseDirectory, "8x"));
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
      },
      stderr: "pipe",
    }));
    const findImage = await client.callTool({ name: "find_image", arguments: { scratchpadFolder: "8x", query: "cats", target: "a1" } });
    assert.equal(findImage.isError, true);
    const tagImage = await client.callTool({ name: "tag_image", arguments: { scratchpadFolder: "8x", action: "add_tag", target: ["p1", "a2"], tags: ["favorite"] } });
    assert.equal(tagImage.isError, true);
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("the built bridge exposes find_image and tag_image over stdio", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
      },
      stderr: "pipe",
    }));
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ["find_image", "tag_image"]);
    const findImage = tools.find((tool) => tool.name === "find_image");
    assert.deepEqual(findImage?.inputSchema.required, ["scratchpadFolder"]);
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

// MCP_MADE_FOR defaults to "bionic" (the previous test) — scratchpadFolder is required there.
test("with MCP_MADE_FOR=generic, scratchpadFolder is optional in the exposed schema", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
        MCP_MADE_FOR: "generic",
      },
      stderr: "pipe",
    }));
    const { tools } = await client.listTools();
    const findImage = tools.find((tool) => tool.name === "find_image");
    assert.deepEqual(findImage?.inputSchema.required, []);
    const tagImage = tools.find((tool) => tool.name === "tag_image");
    assert.deepEqual(tagImage?.inputSchema.required, ["action"]);
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("the deprecated MCP_MADE_FOR_BIONIC=false boolean still resolves to the generic preset", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
        MCP_MADE_FOR_BIONIC: "false",
      },
      stderr: "pipe",
    }));
    const { tools } = await client.listTools();
    const findImage = tools.find((tool) => tool.name === "find_image");
    assert.deepEqual(findImage?.inputSchema.required, []);
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("materializeSearchResult skips the HTML report when writeReport is false", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    const indexer = {
      downloadPreview: async () => Buffer.from("preview-bytes"),
    } as unknown as RemoteIndexerClient;
    const materialized = await materializeSearchResult({
      totalFound: 1,
      images: [{
        rank: 1,
        imagePaths: ["/Users/tester/Pictures/reference-image.png"],
        httpPreviewUrls: ["https://indexer/previews/dl_generic/1/display_1024"],
      }],
    }, scratchpadPath, indexer, { writeReport: false });

    assert.equal(materialized.reportPath, undefined);
    await assert.rejects(fs.stat(path.join(scratchpadPath, "dl_generic.html")), { code: "ENOENT" });
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("buildGenericFindImageResult embeds a base64 preview, an original link, and the raw metadata", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    const indexer = {
      downloadPreview: async () => Buffer.from("preview-bytes"),
    } as unknown as RemoteIndexerClient;
    const images = [{
      rank: 1,
      imagePaths: ["/Users/tester/Pictures/reference-image.png"],
      httpPreviewUrls: ["https://indexer/previews/dl_generic2/1/display_1024"],
      prompt: "a cat",
    }];
    const materialized = await materializeSearchResult({ totalFound: 1, images }, scratchpadPath, indexer, { writeReport: false });

    const result = await buildGenericFindImageResult(1, materialized, scratchpadPath, images);
    const imageContent = result.content.find((item): item is { type: string; data: string } => (item as { type?: unknown }).type === "image") as { type: string; data: string } | undefined;
    assert.equal(imageContent?.data, Buffer.from("preview-bytes").toString("base64"));

    const textContents = result.content.filter((item): item is { type: string; text: string } => (item as { type?: unknown }).type === "text").map((item) => item.text);
    assert.ok(textContents.some((text) => text === `Original p1: ${pathToFileURL("/Users/tester/Pictures/reference-image.png").href}`));
    assert.ok(textContents.some((text) => text.includes("\"prompt\": \"a cat\"")));
    assert.ok(textContents.some((text) => text.includes("Refer to this result as its `p1`")));
    assert.ok(textContents.some((text) => text.includes("Use an appopriate method to show")));
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("buildGenericFindImageResult omits the display-method sentence when mentionDisplayMethod is false (unsloth)", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  try {
    const scratchpadPath = path.join(baseDirectory, "8x");
    await fs.mkdir(scratchpadPath);
    const indexer = {
      downloadPreview: async () => Buffer.from("preview-bytes"),
    } as unknown as RemoteIndexerClient;
    const images = [{
      rank: 1,
      imagePaths: ["/Users/tester/Pictures/reference-image.png"],
      httpPreviewUrls: ["https://indexer/previews/dl_generic3/1/display_1024"],
    }];
    const materialized = await materializeSearchResult({ totalFound: 1, images }, scratchpadPath, indexer, { writeReport: false });

    const result = await buildGenericFindImageResult(1, materialized, scratchpadPath, images, false);
    const textContents = result.content.filter((item): item is { type: string; text: string } => (item as { type?: unknown }).type === "text").map((item) => item.text);
    assert.ok(!textContents.some((text) => text.includes("Use an appopriate method to show")));
  } finally {
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

/** Builds a throwaway studio.db matching the real schema (verified 2026-09-27 — see
 *  made-for-bionic/planning/made-for-preset-rollout-plan.md). Mirrors made-for-bionic-core's
 *  own unslothAttachments.test.ts fixture builder — kept local since this bridge doesn't
 *  depend on made-for-bionic-core's TypeScript sources. */
function buildStudioDb(dbPath: string, threadId: string, attachments: Array<{ id: string; name: string }>): void {
  const attachmentsJson = JSON.stringify(
    attachments.map((a) => ({ id: a.id, type: "image", name: a.name, contentType: "image/png", content: [{ type: "image", image: "data:image/png;base64,aGVsbG8=" }] }))
  );
  const inventoryRows = attachments.map((a) => `INSERT INTO chat_attachment_inventory VALUES ('msg-1', '${a.id}', '${a.name}', 'image', 'image/png', 100);`).join("\n");
  const sql = `
    CREATE TABLE chat_threads (id TEXT PRIMARY KEY);
    CREATE TABLE chat_messages (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, created_at TEXT NOT NULL, attachments_json TEXT);
    CREATE TABLE chat_attachment_inventory (message_id TEXT NOT NULL, attachment_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT, content_type TEXT, size_bytes INTEGER, PRIMARY KEY(message_id, attachment_id)) WITHOUT ROWID;
    CREATE TABLE chat_attachment_tombstones (thread_id TEXT, message_id TEXT, attachment_id TEXT, deleted_at TEXT);
    CREATE TABLE chat_attachment_inventory_state (singleton INTEGER PRIMARY KEY, inventory_version INTEGER, dirty INTEGER, backfilled_at TEXT);
    INSERT INTO chat_attachment_inventory_state VALUES (1, 1, 0, '2026-01-01T00:00:00.000Z');
    INSERT INTO chat_threads VALUES ('${threadId}');
    INSERT INTO chat_messages VALUES ('msg-1', '${threadId}', '2026-01-01T00:00:00.000Z', '${attachmentsJson}');
    ${inventoryRows}
  `;
  execFileSync("sqlite3", [dbPath], { input: sql });
}

test("with MCP_MADE_FOR=unsloth, scratchpadFolder is required, same as bionic", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
        MCP_MADE_FOR: "unsloth",
      },
      stderr: "pipe",
    }));
    const { tools } = await client.listTools();
    const findImage = tools.find((tool) => tool.name === "find_image");
    assert.deepEqual(findImage?.inputSchema.required, ["scratchpadFolder"]);
    const scratchpadFolderDescription = (findImage?.inputSchema.properties as Record<string, { description?: string }>).scratchpadFolder?.description;
    assert.match(scratchpadFolderDescription ?? "", /cat \.unsloth_sandbox/);
    assert.doesNotMatch(scratchpadFolderDescription ?? "", /get_scratchpad_folder/);
    const targetDescription = (findImage?.inputSchema.properties as Record<string, { description?: string }>).target?.description;
    assert.match(targetDescription ?? "", /aN \(attachment/);
    assert.match(targetDescription ?? "", /"aN"/);
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("unsloth pilot: an unresolvable aN target is blocked with the attachment inventory, before the indexer is ever called", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const threadId = "__LOCALID_test";
    await fs.mkdir(path.join(baseDirectory, threadId));
    const dbPath = path.join(baseDirectory, "studio.db");
    buildStudioDb(dbPath, threadId, [{ id: "att-1", name: "cat.png" }]);
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
        MCP_MADE_FOR: "unsloth",
        CLIENT_DB_LOCATION: dbPath,
      },
      stderr: "pipe",
    }));
    const result = await client.callTool({ name: "find_image", arguments: { scratchpadFolder: threadId, query: "cats", target: "a2" } });
    assert.equal(result.isError, undefined);
    const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
    assert.equal(text, "a1: cat.png, image, image/png, 100");
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("unsloth pilot: the literal \"aN\" placeholder also lists the attachment inventory", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const threadId = "__LOCALID_test";
    await fs.mkdir(path.join(baseDirectory, threadId));
    const dbPath = path.join(baseDirectory, "studio.db");
    buildStudioDb(dbPath, threadId, [{ id: "att-1", name: "cat.png" }]);
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
        MCP_MADE_FOR: "unsloth",
        CLIENT_DB_LOCATION: dbPath,
      },
      stderr: "pipe",
    }));
    for (const placeholder of ["aN", "a"]) {
      const result = await client.callTool({ name: "find_image", arguments: { scratchpadFolder: threadId, query: "cats", target: placeholder } });
      assert.equal(result.isError, undefined, `target=${placeholder}`);
      const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
      assert.equal(text, "a1: cat.png, image, image/png, 100", `target=${placeholder}`);
    }
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});

test("unsloth pilot: a valid aN target passes the hook and reaches target resolution (materializes a1 on disk)", async () => {
  const baseDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "find-images-bridge-"));
  const client = new Client({ name: "find-images-mcp-bridge-test", version: "0.1.0" });
  try {
    const threadId = "__LOCALID_test";
    const scratchpadPath = path.join(baseDirectory, threadId);
    await fs.mkdir(scratchpadPath);
    const dbPath = path.join(baseDirectory, "studio.db");
    buildStudioDb(dbPath, threadId, [{ id: "att-1", name: "cat.png" }]);
    const bridgeEntryPoint = new URL("./index.js", import.meta.url).pathname;
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [bridgeEntryPoint],
      env: {
        CHAT_WORKING_DIRECTORIES: baseDirectory,
        FIND_IMAGES_MCP_INDEXER_URL: "http://127.0.0.1:1",
        FIND_IMAGES_MCP_INDEXER_TOKEN: "test-token",
        MCP_MADE_FOR: "unsloth",
        CLIENT_DB_LOCATION: dbPath,
      },
      stderr: "pipe",
    }));
    // target="a1" exists (unlike the previous test's "a2") — the hook must materialize it and let
    // the call proceed into resolveRemoteTarget()/indexer.uploadImage(), which then fails because
    // no real indexer is listening on this dummy port. The important assertion is what it does NOT
    // say: neither the old "not supported" aN-rejection error nor the inventory-blocked message.
    const result = await client.callTool({ name: "find_image", arguments: { scratchpadFolder: threadId, query: "cats", target: "a1" } });
    const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "";
    assert.ok(!text.includes("not supported"), `should not hit the aN-rejection path: ${text}`);
    assert.ok(!text.startsWith("a1: cat.png"), `should not be blocked with the inventory (a1 exists): ${text}`);
    const state = await readMediaState(scratchpadPath);
    assert.equal(state.attachments.length, 1);
    assert.equal(state.attachments[0].a, 1);
  } finally {
    await client.close();
    await fs.rm(baseDirectory, { recursive: true, force: true });
  }
});