/**
 * Cheap, notation-only check — no filesystem/state access. Callers (MCP adapters) use this to
 * decide whether a raw canvas/target token is already aN/vN/iN/pN and should be left untouched
 * for the plugin's own core/tools.ts parser, or whether it might need resolveMcpSourceToken() as
 * a fallback. Mirrors draw-things-chat-core/src/services/schemas.ts's `SourceNotation` regex —
 * kept as a hand-synced duplicate (not imported) since made-for-bionic-core has no dependency on
 * draw-things-chat-core; each core is deliberately self-contained.
 */
export declare function looksLikeSourceNotation(raw: string): boolean;
/**
 * Splits a raw MCP field value into individual tokens, accepting the same shapes
 * draw-things-chat-core/src/services/schemas.ts's `SourceNotationList` does: a real array, or a
 * comma/space-separated string (e.g. "a1, a2" -> ["a1", "a2"]). A single bare string/basename/path
 * with no separators is returned as a 1-element array. Non-string array entries are stringified.
 */
export declare function normalizeSourceFieldToArray(raw: unknown): string[];
/**
 * Resolves a raw MCP canvas/target token that did NOT match a plugin's own aN/vN/iN/pN notation
 * parser (check with looksLikeSourceNotation() first). Returns either an absolute path to the
 * ORIGINAL file (cases 2/3) or the matching record's own aN/vN/iN/pN notation (case 4) — callers
 * write the return value straight back into the field the plugin's handler reads, and the
 * handler's own parsePrefixedNotation()/path-fallback naturally does the right thing either way.
 * Path results are strictly confined to `scratchpadPath` (the already-resolved scratchpad
 * directory, i.e. resolveEffectiveScratchpadPath()'s return value — CHAT_WORKING_DIRECTORIES/
 * <scratchpadFolder>, or CHAT_WORKING_DIRECTORIES itself when scratchpadFolder was optional and
 * omitted).
 *
 * Four valid MCP input shapes exist in total; this function covers the three NOT already handled
 * by a plugin's own aN/vN/iN/pN parser:
 *   1. aN/vN/iN/pN         — handled by the caller's own notation parser, never reaches here.
 *   2. scratchpad basename — IS the original file already; resolved to an absolute path as-is.
 *   3. absolute path       — IS the original file already; resolved as-is (still confined to
 *                             scratchpadPath — an absolute path is not a containment bypass).
 *   4. a generated PREVIEW's filename (as shown in a prior tool result, e.g.
 *      "preview-image-...-i1.jpg") — resolves to that record's own notation (e.g. "i1"), matched
 *      by preview basename across all four pools (attachments/variants/pictures/images).
 *      Deliberately NOT resolved to `record.filename` directly: a picture (pN) may have no locally
 *      materialized file at all (only a Draw Things project://...sqlite3#id blob, or an external
 *      sourceUrl) — resolving straight to a path here would bypass each plugin's own, more
 *      thorough original-resolution chain (resolveProjectUri, originAbs, preview-fallback — see
 *      e.g. process-image's resolvePictureBuffer()) and could silently return a low-quality
 *      preview instead of the real original. Returning the notation instead routes back through
 *      that exact, unmodified chain, same as if "p3" had been passed directly.
 *
 * Returns null when `raw` isn't shaped like a bare basename or an absolute path (caller should
 * treat it as its own invalid-notation error instead). Throws when it IS shaped like one but
 * escapes `scratchpadPath` or the file doesn't exist — both are unambiguous, actionable errors the
 * caller should surface directly.
 */
export declare function resolveMcpSourceToken(raw: string, scratchpadPath: string): Promise<string | null>;
