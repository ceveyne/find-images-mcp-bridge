export type UnslothAttachment = {
    messageId: string;
    attachmentId: string;
    name: string;
    type: string | null;
    contentType: string | null;
    sizeBytes: number | null;
    /** `data:<mime>;base64,...` payload from `attachments_json`, when present. */
    dataUrl?: string;
};
/**
 * Reads the full, tombstone-filtered, thread-scoped attachment inventory in stable
 * (`created_at`, then in-message array position) order, including each entry's raw base64
 * payload when present in `attachments_json`. Falls back to parsing `attachments_json` directly
 * for any attachment missing from `chat_attachment_inventory` when `dirty=1`.
 */
export declare function readUnslothAttachments(dbPath: string, threadId: string): Promise<UnslothAttachment[]>;
/** `a1: <name>, <type>, <content_type>, <size_bytes>` — one line per entry, 1-based. */
export declare function formatAttachmentInventory(entries: readonly UnslothAttachment[]): string;
