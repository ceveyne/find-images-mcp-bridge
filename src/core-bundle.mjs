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
function scratchpadFolderRemediation(preset) {
  if (preset?.name === "unsloth") return "Run `cat .unsloth_sandbox` and pass its output unchanged as scratchpadFolder.";
  if (preset?.name === "generic") return "If your host provides a scratchpad-folder tool, call it and pass its return value unchanged; otherwise omit scratchpadFolder to use the server's configured working directory.";
  return "Call get_scratchpad_folder and pass its returned value unchanged as scratchpadFolder.";
}
function scratchpadFolderNotFoundResult(requestedFolder, preset) {
  return {
    content: [{ type: "text", text: `The scratchpad folder "${requestedFolder}" was not found. ${scratchpadFolderRemediation(preset)}` }],
    isError: true
  };
}
async function bridgeToolErrorResult(tool, error, logger, preset) {
  await logger.logError("bridge-tool-failed", error, { tool });
  if (error instanceof ScratchpadFolderError) return scratchpadFolderNotFoundResult(error.requestedFolder ?? "", preset);
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

Refer to this result as its \`${primaryNotation}\` canvas/moodboard identifier in any subsequent tool call that accepts an image reference \u2014 e.g. generate_image, zoom-in, or mask.

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

Refer to this result as its \`${result.notation}\` canvas/moodboard identifier in any subsequent tool call that accepts an image reference \u2014 e.g. generate_image, zoom-in, or mask.

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
async function buildGenericResultContent(toolLabel, tier, scratchpadPath, results, summaryText, originalLinksFor, mentionDisplayMethod = true) {
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
  const displayClause = mentionDisplayMethod ? ` Use an appopriate method to show the image(s) ${pronoun} to the user.` : "";
  content.push({
    type: "text",
    text: `${toolLabel} produced ${results.length} ${kind} file(s): ${notations}.${displayClause}

Refer to this result as its \`${primaryNotation}\` canvas/moodboard identifier in any subsequent tool call that accepts an image reference \u2014 e.g. generate_image, zoom-in, or mask.`
  });
  return { content };
}

// src/presets/unsloth.ts
import fs6 from "node:fs/promises";
import path7 from "node:path";

// src/imagePreview.ts
import { Jimp, JimpMime } from "jimp";
var PREVIEW_MAX_SUM = 1792;
var PREVIEW_QUALITY = 80;
async function generateImagePreview(buffer) {
  try {
    const img = await Jimp.read(buffer);
    const width = img.width;
    const height = img.height;
    const sum = width + height;
    if (sum > PREVIEW_MAX_SUM) {
      const scale = PREVIEW_MAX_SUM / sum;
      img.resize({ w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) });
    }
    const previewData = await img.getBuffer(JimpMime.jpeg, { quality: PREVIEW_QUALITY });
    return { width, height, previewData };
  } catch {
    return null;
  }
}
function previewFilenameFrom(originalFilename) {
  const hasPrefix = originalFilename.toLowerCase().startsWith("preview-");
  const base = hasPrefix ? originalFilename : `preview-${originalFilename}`;
  return base.replace(/\.(png|jpg|jpeg|webp|gif)$/i, ".jpg").replace(/ /g, "_");
}
function localTimestamp(date = /* @__PURE__ */ new Date()) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const millis = pad(date.getMilliseconds(), 3);
  const tzOffset = -date.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? "+" : "-";
  const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const tzMins = pad(Math.abs(tzOffset) % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${tzSign}${tzHours}:${tzMins}`;
}

// src/unslothAttachments.ts
import { copyFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
var SQL = null;
async function getSqlJs() {
  if (!SQL) {
    const { default: initSqlJs } = await import("sql.js");
    SQL = await initSqlJs();
  }
  return SQL;
}
function cleanupFile(filePath) {
  if (filePath) {
    try {
      unlinkSync(filePath);
    } catch {
    }
  }
}
async function withSnapshot(dbPath, run) {
  const sqlJs = await getSqlJs();
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  let db = null;
  let tempFile;
  let tempSourceFile;
  try {
    if (existsSync(walPath)) {
      tempFile = join(tmpdir(), `unsloth-attachments-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sqlite3`);
      try {
        execFileSync("sqlite3", ["-readonly", dbPath, `VACUUM INTO '${tempFile.replace(/'/g, "''")}'`], { timeout: 1e4 });
        db = new sqlJs.Database(readFileSync(tempFile));
      } catch {
        cleanupFile(tempFile);
        tempSourceFile = join(tmpdir(), `unsloth-attachments-source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sqlite3`);
        copyFileSync(dbPath, tempSourceFile);
        copyFileSync(walPath, `${tempSourceFile}-wal`);
        if (existsSync(shmPath)) copyFileSync(shmPath, `${tempSourceFile}-shm`);
        execFileSync("sqlite3", [tempSourceFile, `VACUUM INTO '${tempFile.replace(/'/g, "''")}'`], { timeout: 1e4 });
        db = new sqlJs.Database(readFileSync(tempFile));
      }
    } else {
      db = new sqlJs.Database(readFileSync(dbPath));
    }
    return run(db);
  } finally {
    db?.close();
    cleanupFile(tempFile);
    if (tempSourceFile) {
      for (const filePath of [tempSourceFile, `${tempSourceFile}-wal`, `${tempSourceFile}-shm`]) cleanupFile(filePath);
    }
  }
}
function extractPayload(attachmentsJson, attachmentId) {
  if (!attachmentsJson) return void 0;
  try {
    const parsed = JSON.parse(attachmentsJson);
    if (!Array.isArray(parsed)) return void 0;
    const item = parsed.find((entry) => entry && entry.id === attachmentId);
    if (!item || !Array.isArray(item.content)) return void 0;
    for (const block of item.content) {
      if (typeof block?.image === "string") return block.image;
      if (typeof block?.audio === "string") return block.audio;
      if (typeof block?.text === "string") return block.text;
    }
    return void 0;
  } catch {
    return void 0;
  }
}
function orderWithinMessage(attachmentsJson, attachmentId) {
  if (!attachmentsJson) return 0;
  try {
    const parsed = JSON.parse(attachmentsJson);
    if (!Array.isArray(parsed)) return 0;
    const index = parsed.findIndex((entry) => entry && entry.id === attachmentId);
    return index >= 0 ? index : 0;
  } catch {
    return 0;
  }
}
function readInventoryRows(db, threadId) {
  const query = `
    SELECT cai.message_id, cai.attachment_id, cai.name, cai.type, cai.content_type, cai.size_bytes,
           cm.attachments_json, cm.created_at
    FROM chat_attachment_inventory cai
    JOIN chat_messages cm ON cm.id = cai.message_id
    WHERE cm.thread_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM chat_attachment_tombstones t
        WHERE t.message_id = cai.message_id AND t.attachment_id = cai.attachment_id
      )
  `;
  const stmt = db.prepare(query);
  stmt.bind([threadId]);
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const messageId = String(row.message_id);
    const attachmentId = String(row.attachment_id);
    const attachmentsJson = row.attachments_json == null ? null : String(row.attachments_json);
    rows.push({
      entry: {
        messageId,
        attachmentId,
        name: String(row.name),
        type: row.type == null ? null : String(row.type),
        contentType: row.content_type == null ? null : String(row.content_type),
        sizeBytes: typeof row.size_bytes === "number" ? row.size_bytes : null,
        dataUrl: extractPayload(attachmentsJson, attachmentId)
      },
      createdAt: String(row.created_at),
      orderInMessage: orderWithinMessage(attachmentsJson, attachmentId)
    });
  }
  stmt.free();
  return rows;
}
function readDirtyFlag(db) {
  try {
    const result = db.exec("SELECT dirty FROM chat_attachment_inventory_state WHERE singleton = 1");
    const value = result[0]?.values[0]?.[0];
    return value === 1 || value === "1";
  } catch {
    return false;
  }
}
function readAttachmentsJsonFallback(db, threadId, excludeAttachmentIds) {
  const stmt = db.prepare("SELECT id, attachments_json FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC");
  stmt.bind([threadId]);
  const fallback = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const messageId = String(row.id);
    const attachmentsJson = row.attachments_json == null ? null : String(row.attachments_json);
    if (!attachmentsJson) continue;
    try {
      const parsed = JSON.parse(attachmentsJson);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        const attachmentId = typeof item?.id === "string" ? item.id : void 0;
        if (!attachmentId || excludeAttachmentIds.has(attachmentId)) continue;
        fallback.push({
          messageId,
          attachmentId,
          name: typeof item.name === "string" ? item.name : attachmentId,
          type: typeof item.type === "string" ? item.type : null,
          contentType: typeof item.contentType === "string" ? item.contentType : null,
          sizeBytes: null,
          dataUrl: extractPayload(attachmentsJson, attachmentId)
        });
      }
    } catch {
    }
  }
  stmt.free();
  return fallback;
}
async function readUnslothAttachments(dbPath, threadId) {
  return withSnapshot(dbPath, (db) => {
    const rows = readInventoryRows(db, threadId);
    rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.orderInMessage - b.orderInMessage);
    const primary = rows.map((row) => row.entry);
    if (!readDirtyFlag(db)) return primary;
    const known = new Set(primary.map((entry) => entry.attachmentId));
    return [...primary, ...readAttachmentsJsonFallback(db, threadId, known)];
  });
}
function formatAttachmentInventory(entries) {
  return entries.map((entry, index) => `a${index + 1}: ${entry.name}, ${entry.type ?? "unknown"}, ${entry.contentType ?? "unknown"}, ${entry.sizeBytes ?? "unknown"}`).join("\n");
}

// src/presets/unsloth.ts
var unslothPreset = {
  name: "unsloth",
  includeBase64Preview: true,
  writeHtmlReportForMultipleResults: false,
  scratchpadFolderRequired: true,
  beforeToolCall: unslothBeforeToolCall
};
function extensionForContentType(contentType) {
  const subtype = contentType?.split("/")[1]?.split(";")[0]?.replace(/[^a-zA-Z0-9]/g, "");
  return subtype || "bin";
}
async function uniqueOriginalFilename(scratchpadPath, originalName, attachmentId, fallbackExt) {
  const ext = path7.extname(originalName) || `.${fallbackExt}`;
  const base = originalName ? path7.basename(originalName, path7.extname(originalName)) : attachmentId;
  const candidate = `${base}${ext}`;
  try {
    await fs6.stat(path7.join(scratchpadPath, candidate));
    return `${base}-${attachmentId.slice(0, 8)}${ext}`;
  } catch {
    return candidate;
  }
}
async function materializeAttachment(scratchpadPath, attachment) {
  const match = attachment.dataUrl ? /^data:([^;]+);base64,(.+)$/s.exec(attachment.dataUrl) : null;
  if (!match) return void 0;
  const [, mime, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  const filename = await uniqueOriginalFilename(scratchpadPath, attachment.name, attachment.attachmentId, extensionForContentType(attachment.contentType ?? mime));
  const originAbs = path7.join(scratchpadPath, filename);
  await fs6.writeFile(originAbs, bytes);
  const record = {
    originAbs,
    originalName: attachment.name,
    createdAt: localTimestamp()
  };
  const preview = await generateImagePreview(bytes);
  if (preview) {
    const previewFilename = previewFilenameFrom(filename);
    await fs6.writeFile(path7.join(scratchpadPath, previewFilename), preview.previewData);
    record.preview = previewFilename;
    record.width = preview.width;
    record.height = preview.height;
  }
  return record;
}
var ATTACHMENT_NUMBER = /^a([1-9]\d*)$/i;
async function unslothBeforeToolCall(ctx) {
  if (!ctx.clientDbPath) return { blocked: false };
  let attachments;
  try {
    attachments = await readUnslothAttachments(ctx.clientDbPath, ctx.threadId);
  } catch {
    return { blocked: false };
  }
  const relevant = attachments.filter((attachment) => Boolean(attachment.dataUrl));
  const state = await readMediaState(ctx.scratchpadPath);
  const known = new Set(state.attachments.map((record) => record.sourceId).filter((id) => Boolean(id)));
  let changed = false;
  for (const attachment of relevant) {
    if (known.has(attachment.attachmentId)) continue;
    const materialized = await materializeAttachment(ctx.scratchpadPath, attachment);
    if (!materialized) continue;
    state.attachments.push({
      ...materialized,
      a: nextCounter(state, "a"),
      sourceId: attachment.attachmentId
    });
    changed = true;
  }
  if (changed) await writeMediaState(ctx.scratchpadPath, state);
  for (const token of ctx.attachmentTokens) {
    const match = ATTACHMENT_NUMBER.exec(token.trim());
    const number = match ? Number(match[1]) : NaN;
    const exists = Number.isFinite(number) && state.attachments.some((record) => record.a === number);
    if (!exists) {
      return { blocked: true, message: relevant.length > 0 ? formatAttachmentInventory(relevant) : "No attachments are available in this thread yet." };
    }
  }
  return { blocked: false };
}

// src/presets/index.ts
var MADE_FOR_ENV_VAR = "MCP_MADE_FOR";
var PRESETS = {
  bionic: bionicPreset,
  generic: genericPreset,
  unsloth: unslothPreset
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
import fs7 from "node:fs/promises";
import path8 from "node:path";
function looksLikeSourceNotation(raw) {
  const trimmed = String(raw ?? "").trim().toLowerCase();
  const normalized = /^[avpi]$/.test(trimmed) ? `${trimmed}1` : trimmed;
  return /^[avpi][1-9]\d*$/.test(normalized);
}
function normalizeSourceFieldToArray(raw) {
  if (Array.isArray(raw)) return raw.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed.split(/[\s,]+/).filter((v) => v.length > 0);
}
async function resolveMcpSourceToken(raw, scratchpadPath) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const looksLikePath = path8.isAbsolute(trimmed) || trimmed === path8.basename(trimmed);
  if (!looksLikePath) return null;
  const resolvedBase = path8.resolve(scratchpadPath);
  const previewBasename = path8.basename(trimmed);
  const state = await readMediaState(scratchpadPath).catch(() => null);
  if (state) {
    const pools = [
      [state.attachments, "a"],
      [state.variants, "v"],
      [state.pictures, "p"],
      [state.images, "i"]
    ];
    for (const [pool, kind] of pools) {
      const record = pool.find((r) => typeof r.preview === "string" && path8.basename(r.preview) === previewBasename);
      const index = record?.[kind];
      if (typeof index === "number") return `${kind}${index}`;
    }
  }
  const candidate = path8.isAbsolute(trimmed) ? trimmed : path8.join(resolvedBase, trimmed);
  const resolvedCandidate = path8.resolve(candidate);
  const relative = path8.relative(resolvedBase, resolvedCandidate);
  if (relative === ".." || relative.startsWith(`..${path8.sep}`) || path8.isAbsolute(relative)) {
    throw new Error(`Source "${trimmed}" is outside the bound scratchpad directory (${resolvedBase}).`);
  }
  const exists = await fs7.stat(resolvedCandidate).then((s) => s.isFile()).catch(() => false);
  if (!exists) throw new Error(`Source file not found: ${resolvedCandidate}`);
  return resolvedCandidate;
}

// src/originalLink.ts
import { pathToFileURL as pathToFileURL2 } from "node:url";
function buildOriginalLinks(httpBase, scratchpadFolder, filename, absolutePath, notation) {
  const links = [];
  if (httpBase && scratchpadFolder) {
    links.push(`Original ${notation}: ${httpBase.replace(/\/$/, "")}/${encodeURIComponent(scratchpadFolder)}/${encodeURIComponent(filename)}`);
  }
  links.push(`Original ${notation}: ${pathToFileURL2(absolutePath).href}`);
  return links;
}
export {
  MADE_FOR_BIONIC_ENV_VAR,
  MADE_FOR_ENV_VAR,
  ScratchpadFolderError,
  bionicPreset,
  bridgeToolErrorResult,
  buildGenericResultContent,
  buildMultiResultText,
  buildOriginalLinks,
  buildSingleResultText,
  createBridgeLogger,
  ensureMediaState,
  escapeHtml,
  extractSummary,
  extractSummaryText,
  genericPreset,
  looksLikeSourceNotation,
  materializeNewImages,
  mediaStatePath,
  nextCounter,
  normalizeSourceFieldToArray,
  optionalEnv,
  parseMadeForBionicEnv,
  readMediaState,
  recordForNotation,
  renderReportShell,
  requiredEnv,
  resolveBridgePreviewPolicy,
  resolveBridgePreviewPolicyFromEnv,
  resolveMadeForEnv,
  resolveMcpSourceToken,
  resolvePreset,
  resolveScratchpadFolder,
  scratchpadFolderNotFoundResult,
  scratchpadFolderRemediation,
  snapshotImageIndices,
  startStdioMcpServer,
  unslothBeforeToolCall,
  unslothPreset,
  writeMediaState
};
