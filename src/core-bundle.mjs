// src/envConfig.ts
function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}
function optionalEnv(name) {
  return process.env[name]?.trim() || void 0;
}

// src/logger.ts
import fs from "node:fs/promises";
import path from "node:path";
function formatValue(value) {
  return value === void 0 ? "<unset>" : String(value);
}
function formatLocalTimestamp(date) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}
function formatEvent(event, details) {
  const timestamp = formatLocalTimestamp(/* @__PURE__ */ new Date());
  const lines = [`${timestamp} [bridge] ${event}`];
  for (const [name, value] of Object.entries(details)) {
    lines.push(`  ${name}: ${formatValue(value)}`);
  }
  return `${lines.join("\n")}
`;
}
function errorDetails(error) {
  if (!(error instanceof Error)) return { error: String(error) };
  const cause = error.cause;
  return {
    error: error.message,
    causeCode: typeof cause?.code === "string" ? cause.code : void 0,
    causeMessage: typeof cause?.message === "string" ? cause.message : void 0
  };
}
function createBridgeLogger(logFilePath) {
  return {
    async logEvent(event, details = {}) {
      await fs.mkdir(path.dirname(logFilePath), { recursive: true });
      await fs.appendFile(logFilePath, formatEvent(event, details), "utf8");
    },
    async logError(event, error, details = {}) {
      await this.logEvent(event, { ...details, ...errorDetails(error) });
    }
  };
}

// src/scratchpad.ts
import fs3 from "node:fs/promises";
import path3 from "node:path";

// src/mediaState.ts
import fs2 from "node:fs/promises";
import path2 from "node:path";
var MEDIA_STATE_FILE = "chat_media_state.json";
var EMPTY_MEDIA_STATE = { attachments: [], variants: [], pictures: [], images: [], counters: {} };
var RECORD_LIST_BY_KIND = {
  p: "pictures",
  a: "attachments",
  v: "variants",
  i: "images"
};
var COUNTER_KEY_BY_KIND = {
  p: "nextPictureP",
  a: "nextAttachmentA",
  v: "nextVariantV",
  i: "nextImageI"
};
function mediaStatePath(scratchpadPath) {
  return path2.join(scratchpadPath, MEDIA_STATE_FILE);
}
async function ensureMediaState(scratchpadPath) {
  const statePath = mediaStatePath(scratchpadPath);
  try {
    await fs2.access(statePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeMediaState(scratchpadPath, structuredClone(EMPTY_MEDIA_STATE));
  }
}
async function readMediaState(scratchpadPath) {
  await ensureMediaState(scratchpadPath);
  const raw = await fs2.readFile(mediaStatePath(scratchpadPath), "utf8");
  const state = JSON.parse(raw);
  return {
    attachments: Array.isArray(state.attachments) ? state.attachments : [],
    variants: Array.isArray(state.variants) ? state.variants : [],
    pictures: Array.isArray(state.pictures) ? state.pictures : [],
    images: Array.isArray(state.images) ? state.images : [],
    counters: state.counters && typeof state.counters === "object" ? state.counters : {}
  };
}
async function writeMediaState(scratchpadPath, state) {
  const targetPath = mediaStatePath(scratchpadPath);
  const temporaryPath = `${targetPath}.tmp`;
  await fs2.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}
`, "utf8");
  await fs2.rename(temporaryPath, targetPath);
}
function recordForNotation(state, kind, number) {
  return state[RECORD_LIST_BY_KIND[kind]].find((record) => record[kind] === number);
}
function nextCounter(state, kind) {
  const counterKey = COUNTER_KEY_BY_KIND[kind];
  const next = state.counters[counterKey];
  const number = typeof next === "number" && next > 0 ? next : Math.max(0, ...state[RECORD_LIST_BY_KIND[kind]].map((record) => record[kind] ?? 0)) + 1;
  state.counters[counterKey] = number + 1;
  return number;
}

// src/scratchpad.ts
var ScratchpadFolderError = class extends Error {
};
async function resolveScratchpadFolder(baseDirectory, requestedFolder, logger) {
  const basePath = path3.resolve(baseDirectory);
  const scratchpadPath = path3.resolve(basePath, requestedFolder);
  const relative = path3.relative(basePath, scratchpadPath);
  await logger?.logEvent("Scratchpad validation", {
    requestedFolder,
    configuredBaseDirectory: baseDirectory,
    resolvedBaseDirectory: basePath,
    resolvedScratchpadPath: scratchpadPath,
    relativePath: relative
  });
  if (!requestedFolder.trim()) {
    const error = new ScratchpadFolderError("scratchpadFolder must not be empty.");
    error.requestedFolder = requestedFolder;
    await logger?.logError("Scratchpad validation failed", error);
    throw error;
  }
  if (!path3.isAbsolute(requestedFolder) && requestedFolder !== path3.basename(requestedFolder)) {
    const error = new ScratchpadFolderError("A relative scratchpadFolder must be one session folder name.");
    error.requestedFolder = requestedFolder;
    await logger?.logError("Scratchpad validation failed", error);
    throw error;
  }
  if (relative === "" || relative === ".." || relative.startsWith(`..${path3.sep}`) || path3.isAbsolute(relative)) {
    const error = new ScratchpadFolderError("scratchpadFolder must resolve to a child of the configured scratchpad directory.");
    error.requestedFolder = requestedFolder;
    await logger?.logError("Scratchpad validation failed", error);
    throw error;
  }
  try {
    const stats = await fs3.stat(scratchpadPath);
    await logger?.logEvent("Scratchpad stat", { path: scratchpadPath, isDirectory: stats.isDirectory() });
    if (!stats.isDirectory()) {
      const error = new ScratchpadFolderError(`The scratchpad folder was not found: ${requestedFolder}`);
      error.requestedFolder = requestedFolder;
      await logger?.logError("Scratchpad validation failed", error);
      throw error;
    }
  } catch (error) {
    if (error instanceof ScratchpadFolderError) throw error;
    await logger?.logError("Scratchpad stat failed", error, { path: scratchpadPath });
    if (error.code === "ENOENT") {
      const folderError = new ScratchpadFolderError(`The scratchpad folder was not found: ${requestedFolder}`);
      folderError.requestedFolder = requestedFolder;
      await logger?.logError("Scratchpad validation failed", folderError);
      throw folderError;
    }
    throw error;
  }
  await ensureMediaState(scratchpadPath);
  return scratchpadPath;
}

// src/htmlReport.ts
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function renderReportShell(title, theadHtml, rowsHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{margin:24px;background:#0e0e0e;color:rgb(251 252 252);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5}.table-frame{display:inline-block;border:1px solid #333;border-radius:8px;overflow:hidden}table{border-collapse:collapse}th,td{border:0;border-right:1px solid #333;border-bottom:1px solid #333;padding:6px;color:inherit;text-align:left;vertical-align:top}th{white-space:nowrap}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}img{display:block;max-width:175px;height:auto;border-radius:12px}.document-cover{position:relative;display:flex;align-items:center;justify-content:center;width:175px;height:132px;border-radius:12px;background:#d4d0c5}.document-cover-icon{width:38%;height:38%;color:#8b8c85}.doc-format{position:absolute;bottom:10px;left:10px;padding:4px 6px;border-radius:4px;color:#effbfc;background:#3d8c98;font-size:10px}.rank{display:inline-block;padding:2px 5px;border-radius:4px;background:#333;color:#fff;font-family:monospace;font-size:12px}</style></head><body><div class="table-frame"><table><thead>${theadHtml}</thead><tbody>${rowsHtml}</tbody></table></div></body></html>`;
}

// src/bridgeErrors.ts
function scratchpadFolderNotFoundResult(requestedFolder) {
  return {
    content: [{ type: "text", text: `The scratchpad folder "${requestedFolder}" was not found. Call get_scratchpad_folder and pass its returned value unchanged as scratchpadFolder.` }],
    isError: true
  };
}
async function bridgeToolErrorResult(tool, error, logger) {
  await logger.logError("bridge-tool-failed", error, { tool });
  if (error instanceof ScratchpadFolderError) return scratchpadFolderNotFoundResult(error.requestedFolder ?? "");
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `${tool} failed: ${message}` }],
    isError: true
  };
}

// src/bridgeServer.ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
function startStdioMcpServer(options) {
  if (options.onShutdown) {
    process.once("SIGINT", options.onShutdown);
    process.once("SIGTERM", options.onShutdown);
  }
  serveStdio(() => {
    const server = new McpServer({ name: options.name, version: options.version }, { capabilities: { resources: {}, prompts: {} } });
    options.buildServer(server);
    return server;
  });
}

// src/previewPolicy.ts
function resolveBridgePreviewPolicy(madeForBionic) {
  return madeForBionic ? { includeBase64Preview: false, writeHtmlReportForMultipleResults: true, scratchpadFolderRequired: true } : { includeBase64Preview: true, writeHtmlReportForMultipleResults: false, scratchpadFolderRequired: false };
}
var MADE_FOR_BIONIC_ENV_VAR = "MCP_MADE_FOR_BIONIC";
function parseMadeForBionicEnv(rawValue) {
  const trimmed = rawValue?.trim();
  if (!trimmed) return true;
  return /^(1|true|yes)$/i.test(trimmed);
}
function resolveBridgePreviewPolicyFromEnv(rawMadeForBionic) {
  return resolveBridgePreviewPolicy(parseMadeForBionicEnv(rawMadeForBionic));
}

// src/mediaMaterializer.ts
import fs4 from "node:fs/promises";
import path4 from "node:path";
async function fileExists(absolutePath) {
  try {
    await fs4.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
async function snapshotImageIndices(scratchpadPath) {
  const state = await readMediaState(scratchpadPath);
  const indices = state.images.map((record) => record.i).filter((i) => typeof i === "number");
  return new Set(indices);
}
async function materializeNewImages(scratchpadPath, before) {
  const state = await readMediaState(scratchpadPath);
  const newRecords = state.images.filter((record) => typeof record.i === "number" && !before.has(record.i));
  const results = [];
  for (const record of newRecords) {
    const index = record.i;
    const filename = record.filename ?? "";
    const absolutePath = path4.join(scratchpadPath, filename);
    const videoFilename = filename.replace(/\.(png|jpe?g|webp)$/i, ".mov");
    const isVideo = videoFilename !== filename && await fileExists(path4.join(scratchpadPath, videoFilename));
    results.push({
      index,
      notation: `i${index}`,
      filename,
      absolutePath,
      previewFilename: record.preview,
      isVideo,
      videoFilename: isVideo ? videoFilename : void 0
    });
  }
  return results.sort((a, b) => a.index - b.index);
}
function extractSummaryText(result) {
  const content = result?.content;
  if (!Array.isArray(content) || content.length === 0) return void 0;
  const lastItem = content[content.length - 1];
  return lastItem?.type === "text" && typeof lastItem.text === "string" ? lastItem.text : void 0;
}
function extractSummary(result) {
  const text = extractSummaryText(result);
  if (text === void 0) return void 0;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}

// src/presets/bionic.ts
import path5 from "node:path";
import { pathToFileURL } from "node:url";
var bionicPreset = {
  name: "bionic",
  includeBase64Preview: false,
  writeHtmlReportForMultipleResults: true,
  scratchpadFolderRequired: true
};
function presentImageGuidance(tier, displayPath, notation) {
  const attachInstruction = `call \`attach_file(path="${displayPath}")\`, then write its Markdown link directly in the chat. Example: ![${notation}](bionic-attached://2eb90efa.png?w=1024&h=768).`;
  if (tier === "process") {
    return `This is an intermediate/working result, not a final one. Only attach this file to the chat if it becomes vote-relevant on its own (e.g. the user should confirm this selection) \u2014 if so, first ${attachInstruction}`;
  }
  return `If you choose to comment on how well the result matches your prompt, present the image to the user in the chat as a reference.

To show an image to the user, first ${attachInstruction}`;
}
function buildMultiResultText(toolLabel, tier, reportPath, results) {
  const reportFileName = path5.basename(reportPath);
  const notations = results.map((r) => r.notation).join(", ");
  const viewPaths = results.map((r) => r.absolutePath);
  const viewPayload = JSON.stringify({ paths: viewPaths, quality: "medium" }, null, 2);
  const openPayload = JSON.stringify({ opened: true, url: pathToFileURL(reportPath).href }, null, 2);
  const primaryNotation = results[0]?.notation ?? "";
  return `${toolLabel} produced ${results.length} file(s): ${notations}. ${reportFileName} provides an overview. Immediately call "open_url_in_app_browser" with the JSON below. Do not call any other tool and do not write a user-facing response before this call completes.

${openPayload}

After the HTML report is open, use "view_images" to inspect the result(s) yourself. This tool does not display images to the user:

${viewPayload}

${presentImageGuidance(tier, viewPaths[0] ?? "", primaryNotation)}

Refer to this result in a subsequent ${toolLabel} call as its \`${primaryNotation}\` canvas/moodboard identifier.

All metadata for the generated file(s) is available in ${reportFileName}.`;
}
function buildSingleResultText(toolLabel, tier, result, summary) {
  const viewPayload = JSON.stringify({ paths: [result.absolutePath], quality: "medium" }, null, 2);
  const openPayload = JSON.stringify({ opened: true, url: pathToFileURL(result.absolutePath).href }, null, 2);
  return `${toolLabel} produced 1 file: ${result.notation}. Immediately call "open_url_in_app_browser" with the JSON below to show the preview to the user. Do not call any other tool and do not write a user-facing response before this call completes.

${openPayload}

After the preview is open, use "view_images" to inspect the result yourself. This tool does not display images to the user:

${viewPayload}

${presentImageGuidance(tier, result.absolutePath, result.notation)}

Refer to this result in a subsequent ${toolLabel} call as its \`${result.notation}\` canvas/moodboard identifier.

Metadata for the generated file (from the tool call):

${JSON.stringify(summary ?? {})}`;
}

// src/presets/generic.ts
import fs5 from "node:fs/promises";
import path6 from "node:path";
var genericPreset = {
  name: "generic",
  includeBase64Preview: true,
  writeHtmlReportForMultipleResults: false,
  scratchpadFolderRequired: false
};
async function buildGenericResultContent(toolLabel, tier, scratchpadPath, results, summaryText, originalLinksFor) {
  const content = [];
  for (const result of results) {
    if (!result.previewFilename) continue;
    try {
      const data = await fs5.readFile(path6.join(scratchpadPath, result.previewFilename));
      content.push({ type: "image", fileName: result.previewFilename, mimeType: "image/jpeg", data: data.toString("base64") });
    } catch {
    }
  }
  for (const result of results) {
    for (const link of originalLinksFor(result)) {
      content.push({ type: "text", text: link });
    }
  }
  if (summaryText) {
    content.push({ type: "text", text: summaryText });
  }
  const notations = results.map((r) => r.notation).join(", ");
  const primaryNotation = results[0]?.notation ?? "";
  const pronoun = results.length > 1 ? "them" : "it";
  const kind = tier === "final" ? "final result" : "intermediate/working";
  content.push({
    type: "text",
    text: `${toolLabel} produced ${results.length} ${kind} file(s): ${notations}. Use an appopriate method to show the image(s) ${pronoun} to the user.

Refer to this result in a subsequent ${toolLabel} call as its \`${primaryNotation}\` canvas/moodboard identifier.`
  });
  return { content };
}

// src/presets/index.ts
var MADE_FOR_ENV_VAR = "MCP_MADE_FOR";
var PRESETS = {
  bionic: bionicPreset,
  generic: genericPreset
};
function resolvePreset(name) {
  const trimmed = name?.trim().toLowerCase();
  return trimmed && PRESETS[trimmed] || bionicPreset;
}
function resolveMadeForEnv(madeForRaw, madeForBionicRaw) {
  const trimmed = madeForRaw?.trim();
  if (trimmed) return resolvePreset(trimmed);
  if (madeForBionicRaw !== void 0) return parseMadeForBionicEnv(madeForBionicRaw) ? bionicPreset : genericPreset;
  return bionicPreset;
}

// src/sourceTargetResolution.ts
import fs6 from "node:fs/promises";
import path7 from "node:path";
async function resolveMcpSourcePathTarget(raw, scratchpadPath) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const looksLikePath = path7.isAbsolute(trimmed) || trimmed === path7.basename(trimmed);
  if (!looksLikePath) return null;
  const resolvedBase = path7.resolve(scratchpadPath);
  const candidate = path7.isAbsolute(trimmed) ? trimmed : path7.join(resolvedBase, trimmed);
  const resolvedCandidate = path7.resolve(candidate);
  const relative = path7.relative(resolvedBase, resolvedCandidate);
  if (relative === ".." || relative.startsWith(`..${path7.sep}`) || path7.isAbsolute(relative)) {
    throw new Error(`Source "${trimmed}" is outside the bound scratchpad directory (${resolvedBase}).`);
  }
  const exists = await fs6.stat(resolvedCandidate).then((s) => s.isFile()).catch(() => false);
  if (!exists) throw new Error(`Source file not found: ${resolvedCandidate}`);
  return resolvedCandidate;
}
export {
  MADE_FOR_BIONIC_ENV_VAR,
  MADE_FOR_ENV_VAR,
  ScratchpadFolderError,
  bionicPreset,
  bridgeToolErrorResult,
  buildGenericResultContent,
  buildMultiResultText,
  buildSingleResultText,
  createBridgeLogger,
  ensureMediaState,
  escapeHtml,
  extractSummary,
  extractSummaryText,
  genericPreset,
  materializeNewImages,
  mediaStatePath,
  nextCounter,
  optionalEnv,
  parseMadeForBionicEnv,
  readMediaState,
  recordForNotation,
  renderReportShell,
  requiredEnv,
  resolveBridgePreviewPolicy,
  resolveBridgePreviewPolicyFromEnv,
  resolveMadeForEnv,
  resolveMcpSourcePathTarget,
  resolvePreset,
  resolveScratchpadFolder,
  scratchpadFolderNotFoundResult,
  snapshotImageIndices,
  startStdioMcpServer,
  writeMediaState
};
