/**
 * Builds the original-file link line(s) for one materialized result: always a file:// link,
 * plus an http:// link when both `httpBase` (a reachable local image server's base URL, e.g.
 * `http://127.0.0.1:54780` — see draw-things-chat-core's getHealthyServerBaseUrl(), kept
 * bridge-side since made-for-bionic-core has zero dependency on that package) and
 * `scratchpadFolder` (the raw session folder name the caller passed, NOT a resolved absolute
 * path) are non-empty.
 *
 * The server serves flatly from CHAT_WORKING_DIRECTORIES/<scratchpadFolder>/<filename> — never
 * from a synthetic per-call chat id (see made-for-preset-rollout-plan.md: an earlier version of
 * this link used chatContextBridge.ts's synthetic, gate-only chatId, which has no relationship
 * to any real directory the server can serve from and always produced a dead link). Centralized
 * here (not duplicated per bridge) so a future fix only needs to happen once.
 */
export declare function buildOriginalLinks(httpBase: string, scratchpadFolder: string | undefined, filename: string, absolutePath: string, notation: string): string[];
