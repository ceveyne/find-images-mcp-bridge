/**
 * Resolves a raw MCP target/canvas token that did NOT match a plugin's own aN/vN/iN/pN notation
 * parser into an absolute path, strictly confined to the already-resolved scratchpad directory.
 *
 * This is an MCP-only concern: the LM-Studio plugin path always resolves every reference via
 * chat_media_state.json (aN/vN/iN/pN) and never reaches this function — MCP tools accept a
 * filename or absolute path ONLY because they cannot resolve aN (chat attachments aren't
 * registered in chat_media_state.json over MCP). Callers must pass the ALREADY-RESOLVED
 * scratchpad directory as `scratchpadPath` (i.e. resolveEffectiveScratchpadPath()'s return
 * value — CHAT_WORKING_DIRECTORIES/<scratchpadFolder>, or CHAT_WORKING_DIRECTORIES itself when
 * scratchpadFolder was optional and omitted) — this function does not know about
 * CHAT_WORKING_DIRECTORIES or scratchpadFolder itself, only the single confining directory.
 *
 * Returns null when `raw` isn't shaped like a bare basename or an absolute path (caller should
 * treat it as its own notation/invalid-notation error instead). Throws when it IS shaped like one
 * but escapes `scratchpadPath` or the file doesn't exist — both are unambiguous, actionable errors
 * the caller should surface directly.
 *
 * Callers MUST try their own aN/vN/iN/pN notation parser FIRST and only call this as the fallback
 * — this function has no notion of those prefixes and will happily treat e.g. "i1" as a literal
 * basename to look up (and fail with "Source file not found" if no such file exists).
 */
export declare function resolveMcpSourcePathTarget(raw: string, scratchpadPath: string): Promise<string | null>;
