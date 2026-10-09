import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { RemoteIndexerClient } from "./remoteIndexerClient.js";
import { readMediaState, type MediaRecord, type MediaState, writeMediaState } from "./scratchpad.js";
import { buildGenericResultContent, buildUnslothResultContent, escapeHtml, nextCounter, recordForNotation, renderReportShell, type MaterializedResult } from "./core-bundle.mjs";

export type SearchImage = Record<string, unknown> & {
  rank?: unknown;
  imagePaths?: unknown;
  httpPreviewUrls?: unknown;
};

export type SearchResult = {
  totalFound?: unknown;
  images?: unknown;
  error?: unknown;
};

const IMAGE_SERVER_ERROR_LOG_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "logs", "find-image-image-server-response-errors.log");

export async function resolveRemoteTarget(
  target: string,
  scratchpadPath: string,
  indexer: RemoteIndexerClient,
): Promise<string> {
  const state = await readMediaState(scratchpadPath);
  const reference = target.trim();
  const resultRank = /^r(\d+)$/i.exec(reference);
  if (resultRank) {
    const record = recordForLatestQueryRank(state, Number(resultRank[1]));
    if (!record) throw new Error(`Result reference ${reference} was not found in the latest Find Images query.`);
    return record.sourceUrl!;
  }
  const notation = /^([pavi])(\d+)$/i.exec(reference);
  if (notation) {
    const record = recordForNotation(state, notation[1].toLowerCase() as "p" | "a" | "v" | "i", Number(notation[2]));
    if (!record) throw new Error(`Image reference ${reference} was not found in chat_media_state.json.`);
    if (notation[1].toLowerCase() === "p" && record.sourceTool === "find_image" && record.sourceUrl?.trim()) {
      return record.sourceUrl;
    }
    return indexer.uploadImage(await localImagePathForRecord(record, scratchpadPath, reference));
  }

  const previewRecord = recordForPreview(state, reference);
  if (previewRecord) return previewRecord.sourceUrl!;

  if (path.isAbsolute(reference)) {
    return indexer.uploadImage(await existingImagePath(reference, `Image path ${reference}`));
  }

  if (reference !== path.basename(reference)) {
    throw new Error("A relative target must be a filename in the scratchpad folder.");
  }
  return indexer.uploadImage(await existingImagePath(path.join(scratchpadPath, reference), `Image file ${reference}`));
}

export async function materializeSearchResult(
  result: SearchResult,
  scratchpadPath: string,
  indexer: RemoteIndexerClient,
  options?: { writeReport?: boolean },
): Promise<{ queryId: string; ranks: number[]; reportPath?: string; pictureNumbersByRank: Map<number, number> }> {
  const images = searchImages(result);
  if (images.length === 0) throw new Error("The remote search returned no preview URLs to materialize.");
  let previewEntries: Array<{ rank: number; previewUrl: string; sourceUrl: string }>;
  try {
    previewEntries = images.map((image) => previewEntryFor(image));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
  const queryId = queryIdFromPreviewUrl(previewEntries[0].previewUrl);
  if (previewEntries.some((entry) => queryIdFromPreviewUrl(entry.previewUrl) !== queryId)) {
    throw new Error("The remote search returned previews from different query IDs.");
  }

  const state = await readMediaState(scratchpadPath);
  const ranks: number[] = [];
  const pictureNumbersByRank = new Map<number, number>();
  for (const entry of previewEntries) {
    const bytes = await indexer.downloadPreview(entry.previewUrl);
    const previewFilename = `preview-${queryId}-${entry.rank}.jpg`;
    await fs.writeFile(path.join(scratchpadPath, previewFilename), bytes);
    const pictureNumber = nextCounter(state, "p");
    state.pictures.push({
      p: pictureNumber,
      sourceUrl: entry.sourceUrl,
      preview: previewFilename,
      queryId,
      rank: entry.rank,
      sourceTool: "find_image",
      pluginId: "ceveyne/find-images-mcp-bridge",
    });
    ranks.push(entry.rank);
    pictureNumbersByRank.set(entry.rank, pictureNumber);
  }
  await writeMediaState(scratchpadPath, state);

  // The HTML report is a Bionic-only presentation mechanism (see findImageToolResult()) — the
  // generic preset skips it entirely (see presets/generic.ts's writeHtmlReportForMultipleResults: false).
  let reportPath: string | undefined;
  if (options?.writeReport ?? true) {
    reportPath = path.join(scratchpadPath, `${queryId}.html`);
    await fs.writeFile(reportPath, buildHtmlReport(queryId, images, pictureNumbersByRank), "utf8");
  }
  return { queryId, ranks, reportPath, pictureNumbersByRank };
}

/**
 * pN is a global, ever-incrementing counter (nextCounter(state, "p")) while `rank` (the join key
 * against the images JSON metadata, the HTML report rows, and view_images' preview paths) restarts
 * at 1 per query — the two never line up, in any preset. Both are equally load-bearing for the
 * agent: `rank` to cross-reference the metadata/report/view_images it already has in front of it,
 * `p` to address the result in a later find_image/tag_image call. Neither value is derivable from
 * the other, so both are always spelled out side by side as labeled fields.
 */
function buildRankToPictureNumber(ranks: number[], pictureNumbersByRank: ReadonlyMap<number, number>): Array<{ rank: number; p: string }> {
  return ranks.map((rank) => {
    const pictureNumber = pictureNumbersByRank.get(rank);
    if (!pictureNumber) throw new Error(`Search result rank ${rank} has no picture number.`);
    return { rank, p: `p${pictureNumber}` };
  });
}

export function findImageToolResult(
  totalFound: number,
  materialized: { queryId: string; ranks: number[]; reportPath: string; pictureNumbersByRank: ReadonlyMap<number, number> },
): string {
  const scratchpadPath = path.dirname(materialized.reportPath);
  const previewPaths = materialized.ranks.map((rank) => path.join(scratchpadPath, `preview-${materialized.queryId}-${rank}.jpg`));
  const viewPayload = JSON.stringify({ paths: previewPaths, quality: "medium" }, null, 2);
  const rankToPictureNumber = JSON.stringify(buildRankToPictureNumber(materialized.ranks, materialized.pictureNumbersByRank), null, 2);
  // The hard constraint leads (not "The search returned N results..." first) — real Bionic traces
  // (2026-10-09) showed the agent skipping straight to view_images and ignoring this instruction
  // when it was buried as the 3rd sentence. Leading with it is the strongest lever this text alone
  // has; not a guaranteed fix for LLM instruction-following, just the most prominent placement.
  return `Immediately call "open_url_in_app_browser" with the JSON below — before any other tool call and before any user-facing response. The search returned ${totalFound} results; ${materialized.queryId}.html provides an overview.\n\n${JSON.stringify({ opened: true, url: pathToFileURL(materialized.reportPath).href }, null, 2)}\n\nAfter the HTML report is open, use "view_images" to inspect the best matches yourself. This tool does not display images to the user:\n\n${viewPayload}\n\nEach result's rank (used in the images metadata, the HTML report, and the view_images paths above) and its picture number (used to refer to that result in a later find_image or tag_image target) are both listed here — neither can be derived from the other:\n\n${rankToPictureNumber}\n\nThen present the best results to the user in the chat. To show a selected image to the user, first call \`attach_file(path="${path.join(scratchpadPath, `preview-${materialized.queryId}-<rank>.jpg`)}")\`, then write its Markdown link directly in the chat. Example: ![preview-${materialized.queryId}-1.jpg](bionic-attached://2eb90efa.jpg?w=1024&h=768).\n\nTo improve the search, refine the query text or provide any reference image.\n\nAll metadata for the found images is available in ${materialized.queryId}.html.`;
}

type FindImageMaterialized = { queryId: string; ranks: number[]; pictureNumbersByRank: Map<number, number> };

/**
 * Builds the shared `MaterializedResult[]`/`summaryText` pair consumed by both
 * `buildGenericFindImageResult()` and `buildUnslothFindImageResult()` below — base64 preview per
 * result (from the already-downloaded preview JPG), a per-result original-source link, and the
 * raw per-image search metadata forwarded verbatim plus the same rank/p mapping bionic gets (see
 * buildRankToPictureNumber() doc comment) — `images` itself is untouched, the mapping is a sibling
 * field. `images`/`pictureNumbersByRank` come straight out of materializeSearchResult(); no
 * metadata is re-extracted or reformatted here.
 */
function findImageResultInputs(
  totalFound: number,
  materialized: FindImageMaterialized,
  images: SearchImage[],
): { results: MaterializedResult[]; summaryText: string } {
  const results: MaterializedResult[] = materialized.ranks.map((rank) => {
    const pictureNumber = materialized.pictureNumbersByRank.get(rank);
    if (!pictureNumber) throw new Error(`Search result rank ${rank} has no picture number.`);
    const { sourceUrl } = previewEntryFor(images.find((image) => image.rank === rank)!);
    return {
      index: pictureNumber,
      notation: `p${pictureNumber}`,
      filename: "",
      // Repurposed to carry the (possibly non-filesystem) sourceUrl through to originalLinksFor below.
      absolutePath: sourceUrl,
      previewFilename: `preview-${materialized.queryId}-${rank}.jpg`,
    };
  });
  const summaryText = JSON.stringify(
    { totalFound, queryId: materialized.queryId, images, rankToPictureNumber: buildRankToPictureNumber(materialized.ranks, materialized.pictureNumbersByRank) },
    null,
    2,
  );
  return { results, summaryText };
}

/**
 * Generic-preset result content (no HTML report — see presets/generic.ts's
 * buildGenericResultContent()). Generic preset ONLY — unsloth has its own, independent
 * buildUnslothFindImageResult() below (see made-for-preset-rollout-plan.md).
 */
export async function buildGenericFindImageResult(
  totalFound: number,
  materialized: FindImageMaterialized,
  scratchpadPath: string,
  images: SearchImage[],
): Promise<{ content: unknown[] }> {
  const { results, summaryText } = findImageResultInputs(totalFound, materialized, images);
  return buildGenericResultContent("find_image", "final", scratchpadPath, results, summaryText, (result) => [originalLinkFor(result.absolutePath, result.notation)]);
}

/**
 * Unsloth-preset result content — made-for-bionic-core's own, independent builder (see
 * unsloth.ts's buildUnslothResultContent()), not a mode of buildGenericResultContent(). Unsloth
 * already displays base64 image content and attachments automatically, so this omits the
 * "show this to the user" sentence that buildGenericResultContent() always includes.
 */
export async function buildUnslothFindImageResult(
  totalFound: number,
  materialized: FindImageMaterialized,
  scratchpadPath: string,
  images: SearchImage[],
): Promise<{ content: unknown[] }> {
  const { results, summaryText } = findImageResultInputs(totalFound, materialized, images);
  return buildUnslothResultContent("find_image", "final", scratchpadPath, results, summaryText, (result) => [originalLinkFor(result.absolutePath, result.notation)]);
}

function originalLinkFor(sourceUrl: string, notation: string): string {
  if (!sourceUrl.trim()) return `Original ${notation}: unknown source`;
  if (path.isAbsolute(sourceUrl)) return `Original ${notation}: ${pathToFileURL(sourceUrl).href}`;
  return `Original ${notation}: ${sourceUrl}`;
}

function recordForLatestQueryRank(state: MediaState, rank: number): MediaRecord | undefined {
  for (let index = state.pictures.length - 1; index >= 0; index -= 1) {
    const latestRecord = state.pictures[index];
    if (latestRecord.sourceTool !== "find_image" || !latestRecord.queryId?.trim()) continue;
    return state.pictures.find((record) => record.sourceTool === "find_image" && record.queryId === latestRecord.queryId && record.rank === rank && record.sourceUrl?.trim());
  }
  return undefined;
}

function recordForPreview(state: MediaState, reference: string): MediaRecord | undefined {
  const filename = path.basename(reference);
  return state.pictures.find((record) => record.sourceTool === "find_image" && record.preview === filename && record.sourceUrl?.trim());
}

async function localImagePathForRecord(record: MediaRecord, scratchpadPath: string, reference: string): Promise<string> {
  for (const candidate of [record.originAbs, record.filename, record.preview]) {
    if (!candidate) continue;
    const imagePath = path.isAbsolute(candidate) ? candidate : path.join(scratchpadPath, candidate);
    try {
      return await existingImagePath(imagePath, `Image reference ${reference}`);
    } catch (error) {
      if ((error as Error).message.includes("is not an existing file")) continue;
      throw error;
    }
  }
  throw new Error(`Image reference ${reference} has no local image file to upload.`);
}

async function existingImagePath(imagePath: string, label: string): Promise<string> {
  try {
    const stats = await fs.stat(imagePath);
    if (stats.isFile()) return imagePath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  throw new Error(`${label} is not an existing file.`);
}

function searchImages(result: SearchResult): SearchImage[] {
  if (!Array.isArray(result.images)) return [];
  return result.images.filter((image): image is SearchImage => !!image && typeof image === "object");
}

function previewEntryFor(image: SearchImage): { rank: number; previewUrl: string; sourceUrl: string } {
  if (!Number.isInteger(image.rank) || (image.rank as number) < 1) throw new Error("A search result has no valid rank.");
  const previewUrl = Array.isArray(image.httpPreviewUrls) ? image.httpPreviewUrls.find((url): url is string => typeof url === "string") : undefined;
  if (!previewUrl) throw new Error(`Search result rank ${image.rank} has no preview URL.`);
  const sourceUrl = Array.isArray(image.imagePaths) ? image.imagePaths.find((value): value is string => typeof value === "string") : undefined;
  if (!sourceUrl) throw new Error(`Search result rank ${image.rank} has no canonical source URL.`);
  return { rank: image.rank as number, previewUrl, sourceUrl };
}

function queryIdFromPreviewUrl(previewUrl: string): string {
  const match = /\/previews\/([^/]+)\/\d+(?:\/[^/?#]+)?(?:[?#]|$)/.exec(previewUrl);
  if (!match) throw new Error(`Preview URL has no download ID: ${previewUrl}`);
  return match[1];
}

export async function appendImageServerResponse(result: SearchResult): Promise<void> {
  const entry = `[${formatLocalTimestamp(new Date())}] Image Server response:\n${JSON.stringify(result, null, 2)}\n\n`;
  await fs.mkdir(path.dirname(IMAGE_SERVER_ERROR_LOG_PATH), { recursive: true });
  await fs.appendFile(IMAGE_SERVER_ERROR_LOG_PATH, entry, "utf8");
}

// Local system time, not UTC - matches core-bundle.mjs's bridge event log format.
function formatLocalTimestamp(date: Date): string {
  const pad = (value: number, width = 2): string => String(value).padStart(width, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function buildHtmlReport(queryId: string, images: SearchImage[], pictureNumbersByRank: ReadonlyMap<number, number>): string {
  const rows = images.map((image) => {
    const { rank, sourceUrl } = previewEntryFor(image);
    const pictureNumber = pictureNumbersByRank.get(rank);
    if (!pictureNumber) throw new Error(`Search result rank ${rank} has no picture number.`);
    const previewFilename = `preview-${queryId}-${rank}.jpg`;
    const preview = isMarkdownDocument(image)
      ? markdownDocumentCover()
      : `<a href="${escapeHtml(sourceUrl)}"><img src="${escapeHtml(previewFilename)}" alt="Preview p${pictureNumber}"></a>`;
    return `<tr><td>${preview}</td><td>${buildMetadataCell(image, `p${pictureNumber}`)}</td></tr>`;
  }).join("\n");
  return renderReportShell(`Find Images ${queryId}`, "<tr><th>Preview</th><th>ID / Generation Data</th></tr>", rows);
}

function isMarkdownDocument(image: SearchImage): boolean {
  const sourceInfo = recordValue(image.sourceInfo);
  if (sourceInfo?.type !== "document") return false;
  const documentPath = displayValue(sourceInfo.documentPath) ?? stringList(image.imagePaths)[0];
  return documentPath?.toLowerCase().endsWith(".md") ?? false;
}

function markdownDocumentCover(): string {
  return `<span class="document-cover"><svg class="document-cover-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/></svg><span class="doc-format">MD</span></span>`;
}

function buildMetadataCell(image: SearchImage, label: string): string {
  const parts = [`<span class="rank">${escapeHtml(label)}</span>`];
  const add = (name: string, value: unknown): void => {
    const text = displayValue(value);
    if (text) parts.push(`<strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}`);
  };
  const sourceInfo = recordValue(image.sourceInfo);
  const modelMeta = recordValue(image.model_meta);
  const width = numberValue(image.width);
  const height = numberValue(image.height);
  const numFrames = numberValue(image.numFrames);

  const prompt = displayValue(image.matchedChunkText ?? image.prompt);
  add("Prompt", isMarkdownDocument(image) && prompt ? truncateMarkdownPrompt(prompt) : prompt);
  if (numFrames && numFrames > 1) add("Type", `video (${numFrames} frames)`);
  if (width !== undefined || height !== undefined) add("Size", `${width ?? 0}x${height ?? 0}`);
  if (numFrames && numFrames > 1) add("Frames", numFrames);
  add("Model", image.model_display ?? image.model);
  add("Model used", modelMeta?.model_used);
  add("Family", modelMeta?.model_family);
  add("Custom configs", stringList(modelMeta?.custom_config_labels).join(", "));
  add("LoRAs", stringList(image.loras).join(", "));
  add("Tags", stringList(image.tags).join(", "));
  add("Match", image.matchType);
  add("Score", image.matchScore);
  const source = sourceDescription(sourceInfo, image.imagePaths);
  if (source) parts.push(`<strong>Source:</strong> ${escapeHtml(source)}`);
  add("Origin", sourceInfo?.imageType);
  add("Timestamp", image.timestamp);
  return parts.join(" &bull; ");
}

function sourceDescription(sourceInfo: Record<string, unknown> | undefined, imagePaths: unknown): string | undefined {
  const type = displayValue(sourceInfo?.type);
  if (!type) return undefined;
  const label = type.replace(/_/g, " ");
  const sourcePath = stringList(imagePaths)[0];
  if (type === "document") {
    const documentPath = displayValue(sourceInfo?.documentPath) ?? sourcePath;
    const filename = documentPath?.split("/").at(-1);
    return filename ? `${label} (${filename})` : label;
  }
  const projectName = sourcePath?.startsWith("project://") ? projectNameFromPath(sourcePath) : undefined;
  const chatId = displayValue(sourceInfo?.chatId);
  const extra = sourceInfo
    ? (chatId ? `LM Studio chat ${chatId}` : undefined) ?? projectName ?? displayValue(sourceInfo.projectFile) ?? displayValue(sourceInfo.originalName) ?? (sourcePath ? path.basename(sourcePath) : undefined)
    : projectName;
  return extra ? `${label} (${extra})` : label;
}

function projectNameFromPath(projectUrl: string): string | undefined {
  const projectPath = projectUrl.slice("project://".length).split("#", 1)[0];
  const filename = projectPath.split("/").at(-1);
  return filename?.replace(/\.(drawthings|sqlite3|dtproj|json)$/i, "") || undefined;
}

function truncateMarkdownPrompt(prompt: string): string {
  const maximumLength = 320;
  if (prompt.length <= maximumLength) return prompt;
  const truncated = prompt.slice(0, maximumLength - 3);
  const wordBoundary = truncated.lastIndexOf(" ");
  return `${(wordBoundary > 0 ? truncated.slice(0, wordBoundary) : truncated).trimEnd()}...`;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function displayValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
}