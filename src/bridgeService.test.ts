import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { materializeSearchResult, resolveRemoteTarget } from "./bridgeService.js";
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
    const report = await fs.readFile(materialized.reportPath, "utf8");
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
    const report = await fs.readFile(materialized.reportPath, "utf8");
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

    const report = await fs.readFile(materialized.reportPath, "utf8");
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