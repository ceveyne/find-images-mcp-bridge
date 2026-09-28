/**
 * "final": a high-quality end result the agent should actively present (e.g. zoom-in/inpaint/
 * outpaint, generate_image/upscale). "process": an intermediate/working step (e.g. crop/mask) —
 * documented fleetingly, not persisted by default. See bionic-mcp-architecture.md,
 * "Materialisierungs-Stufen".
 */
export type ResultTier = "final" | "process";
/**
 * Context for `McpResultPreset.beforeToolCall()` — only unsloth implements this hook (see
 * unsloth.ts). Runs once per tool call, BEFORE a handler processes canvas/moodboard/targets.
 */
export type BeforeToolCallContext = {
    /** Absolute path of the already-resolved scratchpad folder for this call. */
    scratchpadPath: string;
    /** The raw scratchpadFolder value the client passed — for unsloth this IS the
     *  `chat_threads.id` (see `cat .unsloth_sandbox`), needed to scope the attachment query. */
    threadId: string;
    /** Absolute path to the client's own local database (e.g. unsloth's studio.db). Undefined
     *  when the preset doesn't read one. */
    clientDbPath?: string;
    /** aN-shaped tokens (e.g. "a1") found in this call's attachment-eligible fields, deduplicated. */
    attachmentTokens: string[];
};
export type BeforeToolCallResult = {
    blocked: false;
} | {
    blocked: true;
    message: string;
};
/** The 3 policy booleans every Bionic MCP bridge branches its tool result on, plus which preset produced them. */
export interface McpResultPreset {
    name: "bionic" | "generic" | "unsloth";
    includeBase64Preview: boolean;
    writeHtmlReportForMultipleResults: boolean;
    scratchpadFolderRequired: boolean;
    /**
     * Optional per-tool-call lifecycle hook for client-specific attachment materialization.
     * `bionic`/`generic` leave this undefined — bionic has no attachment concept over MCP, and
     * generic rejects `aN` outright (see `assertNoAttachmentNotation()`), so neither ever reaches
     * a point where this hook would matter.
     */
    beforeToolCall?(ctx: BeforeToolCallContext): Promise<BeforeToolCallResult>;
}
