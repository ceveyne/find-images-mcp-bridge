import { fromJsonSchema } from "@modelcontextprotocol/server";
import { logBridgeError, logBridgeEvent } from "./bridgeLogger.js";
import { appendImageServerResponse, findImageToolResult, materializeSearchResult, resolveRemoteTarget, type SearchResult } from "./bridgeService.js";
import { readBridgeConfig } from "./config.js";
import { bridgeToolErrorResult, startStdioMcpServer } from "./core-bundle.mjs";
import { RemoteIndexerClient } from "./remoteIndexerClient.js";
import { resolveScratchpadFolder, ScratchpadFolderError } from "./scratchpad.js";

const FindImageSchema = fromJsonSchema({
	type: "object",
	properties: {
		scratchpadFolder: { type: "string", description: "Required scratchpad session folder. Obtain this value with get_scratchpad_folder." },
		query: { type: "string", description: "Search instruction. With target, positively describe additions or changes; without target, write a complete description. Model:, LoRAs:, Tag:, Tags:, Size:, Source:, Origin:, and Timestamp: are hard AND filters." },
		target: { type: "string", description: "Reference image: aN, vN, iN, pN, a filename in the scratchpad folder, or an absolute path. Set it for 'like this image', 'same style as a1', or changes to a shown image." },
		includeMetadata: { type: "boolean", description: "Add target generation metadata as a ranking signal across the full corpus, not an identical-metadata filter." },
		excludeImage: { type: "boolean", description: "Ignore target pixels. Use only for prompt/metadata similarity, not 'same style' or other image-guided changes." },
		retrievalLimit: { type: "integer", minimum: 1, description: "Maximum number of matching images to return." },
		scopeId: { type: "string", description: "Reserved for the upcoming Search Scope feature; currently has no effect." },
	},
	required: ["scratchpadFolder"],
	additionalProperties: false,
});

const TagImageSchema = fromJsonSchema({
	type: "object",
	properties: {
		scratchpadFolder: { type: "string", description: "Required scratchpad session folder. Obtain this value with get_scratchpad_folder." },
		action: { type: "string", enum: ["list_tags", "show_tag", "add_tag", "remove_tag", "remove_all_tags"], description: "list_tags lists all indexed tags; show_tag lists current tags; add_tag adds tags; remove_tag removes named tags; remove_all_tags clears every tag from each target." },
		target: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }], description: "One or more indexed image references: vN, iN, pN, a filename in the scratchpad folder, or an absolute image path. Use an array for multiple targets." },
		tags: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }], description: "Tags to add or remove. Use an array for multiple tags." },
	},
	required: ["scratchpadFolder", "action"],
	additionalProperties: false,
});

type BridgeToolArgs = Record<string, unknown> & { scratchpadFolder: string };

const logger = { logEvent: logBridgeEvent, logError: logBridgeError };

async function main(): Promise<void> {
	const config = readBridgeConfig();
	const indexer = new RemoteIndexerClient(config);
	await logBridgeEvent("Bridge started", {
		indexerEndpoint: config.indexerUrl.origin,
		chatWorkingDirectories: config.chatWorkingDirectories,
		hasCaCertificate: Boolean(config.indexerCaCertificatePath),
		nodeExecutable: process.execPath,
		nodeVersion: process.version,
		workingDirectory: process.cwd(),
		userId: process.getuid?.(),
		path: process.env.PATH,
	});
	startStdioMcpServer({
		name: "find-images-mcp-bridge",
		version: "0.1.0",
		onShutdown: () => indexer.stopStartedIndexer(),
		buildServer: (server) => {
			server.registerTool("find_image", { description: "Find visually similar and metadata-related images.\nUse this tool for cross-modal retrieval over images from several sources across the local network.", inputSchema: FindImageSchema }, async (args) => {
			try {
				const toolArgs = args as BridgeToolArgs;
				const scratchpadPath = await resolveToolScratchpadFolder(config.chatWorkingDirectories, toolArgs.scratchpadFolder);
				await logBridgeEvent("bridge-tool-request", { tool: "find_image", scratchpadPath, hasTarget: typeof toolArgs.target === "string" });
				const { scratchpadFolder: _scratchpadFolder, ...remoteArgs } = toolArgs;
				if (typeof remoteArgs.target === "string") {
					remoteArgs.target = await resolveRemoteTarget(remoteArgs.target, scratchpadPath, indexer);
				}
				const result = await indexer.callTool("find_image", remoteArgs) as SearchResult;
				await appendImageServerResponse(result);
				if (typeof result.error === "string") throw new Error(result.error);
				const totalFound = typeof result.totalFound === "number" ? result.totalFound : Array.isArray(result.images) ? result.images.length : 0;
				if (totalFound === 0) return { content: [{ type: "text", text: "The search returned 0 results." }] };
				const materialized = await materializeSearchResult(result, scratchpadPath, indexer);
				return {
					content: [{ type: "text", text: findImageToolResult(totalFound, materialized) }],
					structuredContent: { type: "find-images-bridge-result", queryId: materialized.queryId, ranks: materialized.ranks },
				};
			} catch (error) {
				return await bridgeToolErrorResult("find_image", error, logger);
			}
		});

			server.registerTool("tag_image", { description: `Manage persistent tags for indexed images through the configured image server.

Examples:
- { "action": "add_tag", "target": "p1", "tags": ["favorite"] }
- { "action": "remove_tag", "target": ["p1", "v2", "/absolute/path/image.png"], "tags": ["favorite", "reviewed"] }`, inputSchema: TagImageSchema }, async (args) => {
			try {
				const toolArgs = args as BridgeToolArgs;
				const scratchpadPath = await resolveToolScratchpadFolder(config.chatWorkingDirectories, toolArgs.scratchpadFolder);
				await logBridgeEvent("bridge-tool-request", { tool: "tag_image", scratchpadPath, action: typeof toolArgs.action === "string" ? toolArgs.action : null });
				const { scratchpadFolder: _scratchpadFolder, ...remoteArgs } = toolArgs;
				if (typeof remoteArgs.target === "string") {
					remoteArgs.target = await resolveRemoteTarget(remoteArgs.target, scratchpadPath, indexer);
				} else if (Array.isArray(remoteArgs.target)) {
					remoteArgs.target = await Promise.all(remoteArgs.target.map(async (target) => {
						if (typeof target !== "string") throw new Error("Every tag target must be a string.");
						return resolveRemoteTarget(target, scratchpadPath, indexer);
					}));
				}
				const result = await indexer.callTool("tag_image", remoteArgs);
				await appendImageServerResponse(result as SearchResult);
				return { content: [{ type: "text", text: tagImageToolResult(result) }] };
			} catch (error) {
				return await bridgeToolErrorResult("tag_image", error, logger);
			}
		});
		},
	});
}

void main();

async function resolveToolScratchpadFolder(baseDirectory: string, requestedFolder: string): Promise<string> {
	try {
		return await resolveScratchpadFolder(baseDirectory, requestedFolder);
	} catch (error) {
		if (error instanceof ScratchpadFolderError) {
			error.requestedFolder = requestedFolder;
			await logBridgeError("Scratchpad rejected", error, { requestedFolder, configuredBaseDirectory: baseDirectory });
			throw error;
		}
		throw error;
	}
}

function tagImageToolResult(result: unknown): string {
	if (!result || typeof result !== "object") return "The tag action completed.";
	const action = typeof (result as { action?: unknown }).action === "string" ? (result as { action: string }).action : "tag_image";
	const error = typeof (result as { error?: unknown }).error === "string" ? (result as { error: string }).error : undefined;
	if (error) throw new Error(error);
	const tags = Array.isArray((result as { tags?: unknown }).tags) ? (result as { tags: unknown[] }).tags.filter((tag): tag is string => typeof tag === "string") : [];
	return tags.length > 0 ? `${action}: ${tags.join(", ")}` : `${action} completed.`;
}

