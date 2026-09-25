/**
 * Deliberately simplified, hand-kept-in-sync subset of `ChatMediaState`
 * (draw-things-chat-core/src/media-promotion-core/state.ts). This package has no
 * dependency on draw-things-chat-core, so field shape here must be re-checked by hand
 * against that file whenever its owner changes the real schema — it is not imported.
 */
export type MediaRecord = {
    p?: number;
    a?: number;
    v?: number;
    i?: number;
    sourceUrl?: string;
    originAbs?: string;
    filename?: string;
    preview?: string;
    queryId?: string;
    rank?: number;
    sourceTool?: string;
    pluginId?: string;
};
export type MediaState = {
    attachments: MediaRecord[];
    variants: MediaRecord[];
    pictures: MediaRecord[];
    images: MediaRecord[];
    counters: Record<string, number>;
};
export type MediaNotationKind = "p" | "a" | "v" | "i";
export declare function mediaStatePath(scratchpadPath: string): string;
export declare function ensureMediaState(scratchpadPath: string): Promise<void>;
export declare function readMediaState(scratchpadPath: string): Promise<MediaState>;
export declare function writeMediaState(scratchpadPath: string, state: MediaState): Promise<void>;
/** Looks up a record by its `pN`/`aN`/`vN`/`iN` notation kind and number. */
export declare function recordForNotation(state: MediaState, kind: MediaNotationKind, number: number): MediaRecord | undefined;
/** Allocates and persists the next 1-based counter value for the given notation kind. */
export declare function nextCounter(state: MediaState, kind: MediaNotationKind): number;
