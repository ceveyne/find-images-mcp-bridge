import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Agent, fetch as undiciFetch } from "undici";
import { logBridgeError, logBridgeEvent } from "./bridgeLogger.js";
import type { BridgeConfig } from "./config.js";
import { createHeadlessMcpLauncher, type HeadlessMcpLauncher } from "./headlessMcpLauncher.js";

export type RemoteSearchResult = {
  type?: string;
  totalFound?: number;
  images?: Array<Record<string, unknown>>;
};

export class RemoteIndexerClient {
  private readonly fetch: typeof globalThis.fetch;
  private readonly launcher: HeadlessMcpLauncher;

  constructor(private readonly config: BridgeConfig, launcher = createHeadlessMcpLauncher(config)) {
    this.launcher = launcher;
    if (config.indexerCaCertificatePath) {
      const dispatcher = new Agent({ connect: { ca: fsSync.readFileSync(config.indexerCaCertificatePath) } });
      this.fetch = (input, init) => undiciFetch(String(input), { ...init, dispatcher } as never) as unknown as Promise<Response>;
    } else {
      this.fetch = globalThis.fetch;
    }
  }

  async callTool(name: "find_image" | "tag_image", args: Record<string, unknown>): Promise<unknown> {
    try {
      return await this.callToolOnce(name, args);
    } catch (error) {
      await logBridgeError("remote-tool-call-failed", error, { tool: name, endpoint: this.config.indexerUrl.origin });
      if (isConnectionRefused(error)) {
        await logBridgeEvent("remote-indexer-unavailable", { tool: name, endpoint: this.config.indexerUrl.origin });
        const started = await this.launcher.ensureRunning();
        if (!started) throw error;
        return this.callToolOnce(name, args);
      }
      if (isTransientSocketError(error)) {
        await logBridgeEvent("remote-tool-call-retrying", { tool: name, endpoint: this.config.indexerUrl.origin });
        return this.callToolOnce(name, args);
      }
      throw error;
    }
  }

  stopStartedIndexer(): void {
    this.launcher.stop();
  }

  private async callToolOnce(name: "find_image" | "tag_image", args: Record<string, unknown>): Promise<unknown> {
    await logBridgeEvent("remote-tool-call-started", { tool: name, endpoint: this.config.indexerUrl.origin });
    const client = new Client({ name: "find-images-mcp-bridge", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL("/mcp", this.config.indexerUrl), {
      requestInit: { headers: { authorization: `Bearer ${this.config.indexerToken}` } },
      fetch: this.fetch,
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name, arguments: args });
      await logBridgeEvent("remote-tool-call-completed", { tool: name, endpoint: this.config.indexerUrl.origin });
      return result.structuredContent;
    } finally {
      await client.close();
    }
  }

  async uploadImage(imagePath: string): Promise<string> {
    await logBridgeEvent("image-upload-started", { endpoint: this.config.indexerUrl.origin, filename: path.basename(imagePath) });
    const bytes = await fs.readFile(imagePath);
    const response = await this.fetch(new URL("/uploads", this.config.indexerUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.indexerToken}`,
        "content-type": "application/octet-stream",
        "x-find-images-original-filename": encodeURIComponent(path.basename(imagePath)),
      },
      body: bytes,
    });
    if (!response.ok) throw new Error(`Image upload failed with HTTP ${response.status}.`);
    const payload = await response.json() as { url?: unknown };
    if (typeof payload.url !== "string") throw new Error("Indexer upload response has no URL.");
    await logBridgeEvent("image-upload-completed", { endpoint: this.config.indexerUrl.origin, filename: path.basename(imagePath), bytes: bytes.length });
    return payload.url;
  }

  async downloadPreview(previewUrl: string): Promise<Buffer> {
    await logBridgeEvent("preview-download-started", { previewUrl });
    const response = await this.fetch(previewUrl);
    if (!response.ok) throw new Error(`Preview download failed with HTTP ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await logBridgeEvent("preview-download-completed", { previewUrl, bytes: bytes.length });
    return bytes;
  }
}

function isConnectionRefused(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: { code?: unknown } }).cause;
  return cause?.code === "ECONNREFUSED";
}

// Undici's fetch reports a mid-request socket drop (e.g. the local Find Images process
// restarting) as UND_ERR_SOCKET rather than ECONNREFUSED. These are worth a single retry
// without relaunching the headless process, since the server may already be back up.
const TRANSIENT_SOCKET_ERROR_CODES = new Set(["UND_ERR_SOCKET", "ECONNRESET", "EPIPE", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"]);

function isTransientSocketError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as Error & { cause?: { code?: unknown } }).cause;
  return typeof cause?.code === "string" && TRANSIENT_SOCKET_ERROR_CODES.has(cause.code);
}