export type ImagePreview = {
    width: number;
    height: number;
    previewData: Buffer;
};
/** Returns null (never throws) when `buffer` isn't a format Jimp can decode. */
export declare function generateImagePreview(buffer: Buffer): Promise<ImagePreview | null>;
/**
 * Derives "preview-<name>.jpg" from an original filename — duplicated from draw-things-chat-core's
 * media-promotion-core/image.ts previewFilenameFrom() (same idempotent-prefix, forced-.jpg-ext
 * behavior).
 */
export declare function previewFilenameFrom(originalFilename: string): string;
/**
 * Local ISO-with-timezone-offset timestamp (e.g. "2026-09-28T13:00:19.504+02:00") — duplicated
 * from draw-things-chat-core's media-promotion-core/state.ts localTimestamp(). NEVER UTC.
 */
export declare function localTimestamp(date?: Date): string;
