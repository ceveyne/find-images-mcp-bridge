import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { McpResultPreset } from "./core-bundle.mjs";
import type { SkillCheckName, SkillStatus } from "./skillStatus.js";

// Same resolution approach as skillStatus.ts's own defaultProjectRoot() — this repo has no
// draw-things-chat-core dependency, so getProjectRoot() isn't available here.
function defaultProjectRoot(): string {
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

// Mirrors skillStatus.ts's own target-path convention (Bionic vs Unsloth/generic).
function installedSkillRoot(preset: McpResultPreset, homeDir: string, skillName: SkillCheckName): string {
	return preset.name === "bionic" ? path.join(homeDir, ".lmstudio", "skills", skillName) : path.join(homeDir, ".agents", "skills", skillName);
}

function isSkillVariantFile(name: string): boolean {
	return /^SKILL(\.[^.]+)?\.md$/i.test(name);
}

// Copies every real subfolder (e.g. tools/) from sourceDir into destDir — never the sibling
// SKILL.*.md source variants (the caller copies the resolved SKILL.md separately), or install/.
function copySkillSubfolders(sourceDir: string, destDir: string): void {
	for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
		if (entry.name === "install" || isSkillVariantFile(entry.name)) continue;
		const srcPath = path.join(sourceDir, entry.name);
		const destPath = path.join(destDir, entry.name);
		if (entry.isDirectory()) {
			fs.rmSync(destPath, { recursive: true, force: true });
			fs.cpSync(srcPath, destPath, { recursive: true });
		}
	}
}

/**
 * Self-heals the client-installed skill copy from this repo's own local canonical copy. Unlike
 * generate-image/process-image/analyse-image, this repo is distributed via plain `git clone`/
 * `git pull` (no LM Studio Hub file-count limit applies), so the canonical content is always
 * already present on disk — no network fetch needed or appropriate here. Fails open (never
 * throws) — the caller should fall back to the existing notice-only behavior on failure.
 */
export async function syncSkillLocally(skillName: SkillCheckName, preset: McpResultPreset, status: SkillStatus, options?: { projectRoot?: string; homeDir?: string }): Promise<"synced" | "skipped" | "failed"> {
	if (status.state === "disabled" || status.state === "current") return "skipped";

	const projectRoot = options?.projectRoot ?? defaultProjectRoot();
	const homeDir = options?.homeDir ?? os.homedir();
	const sourceDir = path.join(projectRoot, "skills", skillName);
	const canonicalSkillPath = path.join(sourceDir, `SKILL.${preset.name}.md`);
	if (!fs.existsSync(canonicalSkillPath)) return "failed";

	const targetDir = installedSkillRoot(preset, homeDir, skillName);
	try {
		fs.mkdirSync(targetDir, { recursive: true });
		fs.copyFileSync(canonicalSkillPath, path.join(targetDir, "SKILL.md"));
		copySkillSubfolders(sourceDir, targetDir);
		return "synced";
	} catch {
		return "failed";
	}
}
