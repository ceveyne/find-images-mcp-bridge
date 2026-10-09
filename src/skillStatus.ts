import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { McpResultPreset } from "./core-bundle.mjs";

/**
 * 'find-images' is this repo's own skill; 'image-display' is the cross-plugin result-visibility
 * skill maintained centrally in made-for-bionic-core and synced in via scripts/sync-shared-skills.mjs
 * (see skills/image-display/). Both are checked/notified the same way, so a tool-result-level
 * pointer to image-display is actually verified and surfaced — not just a passive mention in
 * SKILL.md's body that an agent could skip.
 */
export type SkillCheckName = "find-images" | "image-display";

export type SkillStatus =
  | { state: "disabled" }
  | { state: "current" }
  | { state: "not-installed"; installScriptPath: string }
  | { state: "stale"; installScriptPath: string };

/**
 * This repo has no draw-things-chat-core dependency, so getProjectRoot() (used by
 * generate-image's skillStatus.ts) isn't available here. tsconfig's rootDir=src/outDir=dist keeps
 * a flat 1:1 mirror, so the compiled dist/skillStatus.js always sits directly in dist/ — one
 * level up from there is reliably the repo root (same approach as bridgeLogger.ts's own
 * import.meta.url-based path resolution).
 */
function defaultProjectRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

// Unsloth Studio and VS Code Copilot both read from ~/.agents/skills; only Bionic uses its own ~/.lmstudio/skills.
function installedSkillRoot(preset: McpResultPreset, homeDir: string, skillName: SkillCheckName): string {
  return preset.name === "bionic" ? path.join(homeDir, ".lmstudio", "skills", skillName) : path.join(homeDir, ".agents", "skills", skillName);
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

/**
 * Compares the installed SKILL.md (client-side) against this repo's canonical SKILL.<preset>.md
 * by content hash — no manual version field to keep in sync, no mtime fragility. Never throws:
 * any read error (missing canonical file, permission issue, ...) is treated as "current" so a
 * broken check can never nag the agent or block the actual tool call.
 *
 * `installScriptPath` always points at this repo's own `skills/find-images/install/` scripts,
 * regardless of `skillName` — 'image-display' has no install/ scripts of its own (see
 * made-for-bionic-core/skills/image-display/), it's installed piggyback by the same scripts that
 * install 'find-images' (see those scripts' "Also install the shared 'image-display' skill" step).
 */
export function checkSkillStatus(preset: McpResultPreset, useSkills: boolean, skillName: SkillCheckName, options?: { projectRoot?: string; homeDir?: string }): SkillStatus {
  if (!useSkills) return { state: "disabled" };
  const projectRoot = options?.projectRoot ?? defaultProjectRoot();
  const homeDir = options?.homeDir ?? os.homedir();
  const skillDir = path.join(projectRoot, "skills", skillName);
  const installScriptPath = path.join(projectRoot, "skills", "find-images", "install", `install_${preset.name}_skills.sh`);
  const installedSkillPath = path.join(installedSkillRoot(preset, homeDir, skillName), "SKILL.md");
  try {
    if (!fs.existsSync(installedSkillPath)) return { state: "not-installed", installScriptPath };
    const canonicalSkillPath = path.join(skillDir, `SKILL.${preset.name}.md`);
    if (sha256File(canonicalSkillPath) !== sha256File(installedSkillPath)) return { state: "stale", installScriptPath };
    return { state: "current" };
  } catch {
    return { state: "current" };
  }
}

/**
 * Surfaces at most one notice per server process lifetime (one MCP server run ~= one client
 * session) — repeating it on every tool call would be exactly the nagging behavior we want to
 * avoid. "disabled" never produces a notice. "current" normally doesn't either — EXCEPT for
 * 'image-display': real-world Bionic traces (2026-10-09) showed the agent never opens that skill
 * on its own even when it's correctly installed — a passive "## Related skills" mention in
 * SKILL.md's body is not enough to get it read. So 'image-display' gets a one-time reminder even
 * when "current", pushing the agent to actually read it instead of assuming the mention sufficed.
 */
export function createSkillNoticeProvider(status: SkillStatus, skillName: SkillCheckName): () => string | undefined {
  let shown = false;
  return () => {
    if (shown) return undefined;
    if (status.state === "disabled") return undefined;
    if (status.state === "current") {
      if (skillName !== "image-display") return undefined;
      shown = true;
      return "Note: before deciding how to present this result (browser vs. chat, what the user actually sees), read skill 'image-display' once this session if you haven't already — it's easy to miss since it's only referenced passively from SKILL.md's 'Related skills' section.";
    }
    shown = true;
    if (status.state === "not-installed") {
      return `Note: the '${skillName}' skill is not installed for this client yet. Ask the user whether to install it by running \`${status.installScriptPath}\`, or whether to set USE_SKILLS=false in this server's environment to stop seeing this note.`;
    }
    return `Note: the installed '${skillName}' skill is out of date. Ask the user to re-run \`${status.installScriptPath}\` to update it.`;
  };
}

