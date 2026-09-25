export type MaterializedResult = {
    index: number;
    notation: string;
    filename: string;
    absolutePath: string;
    previewFilename?: string;
    /** Only ever true for bridges whose tool can produce video (see generate-image); other bridges leave these undefined. */
    isVideo?: boolean;
    videoFilename?: string;
};
/** Snapshot of existing iN indices, taken before a render/edit handler runs. */
export declare function snapshotImageIndices(scratchpadPath: string): Promise<Set<number>>;
/**
 * Diffs chat_media_state.json's images list against a before-snapshot to find the iN entries
 * the handler just appended via appendImages() — the MCP adapter never registers records itself.
 */
export declare function materializeNewImages(scratchpadPath: string, before: Set<number>): Promise<MaterializedResult[]>;
/**
 * A render/edit handler returns its own summary (dimensions, model, mode, timings, ...) as the
 * LAST text content item, JSON-stringified. Returned verbatim (not re-serialized) so callers can
 * forward it 1:1. Used by the generic (non-Bionic) preset path.
 */
export declare function extractSummaryText(result: unknown): string | undefined;
/** Same as extractSummaryText(), but parsed into an object — used by the Bionic preset's HTML report path. */
export declare function extractSummary(result: unknown): Record<string, unknown> | undefined;
