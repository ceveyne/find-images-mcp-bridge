export type LogValue = string | number | boolean | null | undefined;
export type BridgeLogger = {
    logEvent(event: string, details?: Record<string, LogValue>): Promise<void>;
    logError(event: string, error: unknown, details?: Record<string, LogValue>): Promise<void>;
};
/**
 * Creates a file-backed bridge logger.
 *
 * `logFilePath` must be an absolute path resolved by the consumer relative to its own
 * package location (e.g. via `import.meta.url`); this factory does not guess a location.
 */
export declare function createBridgeLogger(logFilePath: string): BridgeLogger;
