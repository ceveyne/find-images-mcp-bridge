import type { MaterializedResult } from "../mediaMaterializer.js";
import type { BeforeToolCallContext, BeforeToolCallResult, McpResultPreset, ResultTier } from "./types.js";
export declare const unslothPreset: McpResultPreset;
/**
 * Re-syncs newly discovered unsloth attachments into `chat_media_state.json` (idempotent via
 * `MediaRecord.sourceId` = `chat_attachment_inventory.attachment_id`), then validates any
 * `aN`-shaped token this call referenced against the now-current state. An unresolvable `aN`
 * returns the full inventory listing instead of letting the tool handler run at all (see plan
 * doc, Schritt 3B point 3) — a bare "a" (no number) is treated the same way, since it can never
 * match a record.
 *
 * Runs on EVERY tool call, not just the first, so an attachment added mid-thread is picked up
 * before the next reference to it — numbering only ever appends (see plan doc point 2), so
 * already-issued `aN` values never change.
 */
export declare function unslothBeforeToolCall(ctx: BeforeToolCallContext): Promise<BeforeToolCallResult>;
/**
 * Unsloth's own, independent tool-result content — NOT shared with generic.ts's
 * buildGenericResultContent(). Paragraph order: image(s), produced-sentence, original link(s),
 * presentImageGuidance(), refer-sentence, metadata label + JSON. Unsloth already auto-displays
 * the base64 image(s) pushed above, so (unlike generic) there is no "show this to the user"
 * sentence anywhere in this message.
 *
 * `originalLinksFor` builds the http(s)/file:// link line(s) for one result — kept as a
 * caller-supplied callback for the same reason as generic.ts's (see its own doc comment).
 */
export declare function buildUnslothResultContent(toolLabel: string, tier: ResultTier, scratchpadPath: string, results: MaterializedResult[], summaryText: string | undefined, originalLinksFor: (result: MaterializedResult) => string[]): Promise<{
    content: unknown[];
}>;
