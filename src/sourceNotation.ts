/**
 * aN is LM-Studio-only: it resolves through the LM-Studio attachment pool in
 * chat_media_state.json's `attachments` list (see draw-things-chat-core's core/tools.ts).
 * This bridge has no LM-Studio-plugin twin and never populates that list itself — Bionic
 * has no equivalent notion of "attachment". To keep the same guardrail as
 * generate-image/process-image/analyse-image, explicit aN notations in `target` are
 * rejected up front rather than silently resolved (bridgeService.ts's own pN/vN/iN
 * lookup would otherwise just fail with an unhelpful "not found in chat_media_state.json").
 *
 * unsloth is the one exception: its attachments are real (see made-for-bionic-core's
 * unslothAttachments.ts/presets/unsloth.ts) — `assertNoAttachmentNotation()` no-ops for that
 * preset, and its `beforeToolCall()` hook resolves aN against chat_media_state.json instead.
 * The bare "a" and the literal placeholder "aN" both match this regex too — neither is a real
 * number, so unsloth's hook treats them the same as any unresolvable number: it returns the
 * current attachment inventory instead of running the tool, which doubles as an explicit
 * "list my attachments" request.
 */
import type { McpResultPreset } from "./core-bundle.mjs";

export const ATTACHMENT_NOTATION = /^a([1-9]\d*|n)?$/i;

export class UnsupportedAttachmentNotationError extends Error {
  constructor(value: string) {
    super(
      `Source "${value}" uses LM-Studio attachment notation (aN), which is not supported here. ` +
        `Pass a vN/iN/pN reference, a scratchpad filename, or an absolute path instead.`
    );
    this.name = "UnsupportedAttachmentNotationError";
  }
}

function rejectIfAttachmentNotation(value: unknown): void {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (ATTACHMENT_NOTATION.test(trimmed)) {
    throw new UnsupportedAttachmentNotationError(trimmed);
  }
}

/**
 * find_image/tag_image both use a single `target` field: a string, or (tag_image only) a
 * string array. No-ops entirely for the unsloth preset (see module doc comment above).
 */
export function assertNoAttachmentNotation(args: Record<string, unknown>, preset: McpResultPreset): void {
  if (preset.name === "unsloth") return;
  const { target } = args;
  if (Array.isArray(target)) {
    target.forEach(rejectIfAttachmentNotation);
  } else {
    rejectIfAttachmentNotation(target);
  }
}

/** Collects every aN-shaped token out of `target` (string or string[]), deduplicated — used to
 *  feed McpResultPreset.beforeToolCall()'s `attachmentTokens` (unsloth only). */
export function collectAttachmentTokens(args: Record<string, unknown>): string[] {
  const { target } = args;
  const tokens = new Set<string>();
  const consider = (value: unknown): void => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (ATTACHMENT_NOTATION.test(trimmed)) tokens.add(trimmed);
  };
  if (Array.isArray(target)) target.forEach(consider);
  else consider(target);
  return [...tokens];
}
