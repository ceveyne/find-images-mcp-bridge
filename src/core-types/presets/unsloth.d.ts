import type { BeforeToolCallContext, BeforeToolCallResult, McpResultPreset } from "./types.js";
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
