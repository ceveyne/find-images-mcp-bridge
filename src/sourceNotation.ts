/**
 * aN is LM-Studio-only: it resolves through the LM-Studio attachment pool in
 * chat_media_state.json's `attachments` list (see draw-things-chat-core's core/tools.ts).
 * This bridge has no LM-Studio-plugin twin and never populates that list itself — Bionic
 * has no equivalent notion of "attachment". To keep the same guardrail as
 * generate-image/process-image/analyse-image, explicit aN notations in `target` are
 * rejected up front rather than silently resolved (bridgeService.ts's own pN/vN/iN
 * lookup would otherwise just fail with an unhelpful "not found in chat_media_state.json").
 */

const ATTACHMENT_NOTATION = /^a([1-9]\d*)?$/i;

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

/** find_image/tag_image both use a single `target` field: a string, or (tag_image only) a string array. */
export function assertNoAttachmentNotation(args: Record<string, unknown>): void {
  const { target } = args;
  if (Array.isArray(target)) {
    target.forEach(rejectIfAttachmentNotation);
  } else {
    rejectIfAttachmentNotation(target);
  }
}
