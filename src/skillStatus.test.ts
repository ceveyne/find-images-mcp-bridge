import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkSkillStatus, createSkillNoticeProvider } from "./skillStatus.js";
import type { McpResultPreset } from "./core-bundle.mjs";

const bionicPreset: McpResultPreset = { name: "bionic", includeBase64Preview: false, writeHtmlReportForMultipleResults: true, scratchpadFolderRequired: true };
const unslothPreset: McpResultPreset = { name: "unsloth", includeBase64Preview: true, writeHtmlReportForMultipleResults: false, scratchpadFolderRequired: true };

/** Builds a throwaway projectRoot with skills/<skillName>/SKILL.<preset>.md, isolated from the real repo. */
function makeProjectRoot(skillContent: string, presetName: string, skillName: "find-images" | "image-display" = "find-images"): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "find-images-skillstatus-test-"));
  const skillDir = path.join(root, "skills", skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, `SKILL.${presetName}.md`), skillContent);
  return root;
}

function makeHomeDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "find-images-skillstatus-home-"));
}

test("checkSkillStatus returns disabled when useSkills is false, without touching the filesystem", () => {
  const status = checkSkillStatus(bionicPreset, false, "find-images", { projectRoot: "/nonexistent", homeDir: "/nonexistent" });
  assert.deepEqual(status, { state: "disabled" });
});

test("checkSkillStatus returns not-installed when the client-side SKILL.md is missing", () => {
  const projectRoot = makeProjectRoot("content", "bionic");
  const homeDir = makeHomeDir();
  const status = checkSkillStatus(bionicPreset, true, "find-images", { projectRoot, homeDir });
  assert.equal(status.state, "not-installed");
  assert.ok("installScriptPath" in status && status.installScriptPath.endsWith("install/install_bionic_skills.sh"));
});

test("checkSkillStatus returns current when installed content matches the canonical file", () => {
  const projectRoot = makeProjectRoot("same content", "bionic");
  const homeDir = makeHomeDir();
  const installedDir = path.join(homeDir, ".lmstudio", "skills", "find-images");
  fs.mkdirSync(installedDir, { recursive: true });
  fs.writeFileSync(path.join(installedDir, "SKILL.md"), "same content");
  assert.deepEqual(checkSkillStatus(bionicPreset, true, "find-images", { projectRoot, homeDir }), { state: "current" });
});

test("checkSkillStatus returns stale when installed content differs from the canonical file", () => {
  const projectRoot = makeProjectRoot("new content", "bionic");
  const homeDir = makeHomeDir();
  const installedDir = path.join(homeDir, ".lmstudio", "skills", "find-images");
  fs.mkdirSync(installedDir, { recursive: true });
  fs.writeFileSync(path.join(installedDir, "SKILL.md"), "old content");
  const status = checkSkillStatus(bionicPreset, true, "find-images", { projectRoot, homeDir });
  assert.equal(status.state, "stale");
});

test("checkSkillStatus uses ~/.agents/skills for unsloth, not ~/.lmstudio/skills", () => {
  const projectRoot = makeProjectRoot("same content", "unsloth");
  const homeDir = makeHomeDir();
  const installedDir = path.join(homeDir, ".agents", "skills", "find-images");
  fs.mkdirSync(installedDir, { recursive: true });
  fs.writeFileSync(path.join(installedDir, "SKILL.md"), "same content");
  assert.deepEqual(checkSkillStatus(unslothPreset, true, "find-images", { projectRoot, homeDir }), { state: "current" });
});

test("checkSkillStatus fails open (current) when the canonical file is missing, never throws", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "find-images-skillstatus-empty-"));
  const homeDir = makeHomeDir();
  const installedDir = path.join(homeDir, ".lmstudio", "skills", "find-images");
  fs.mkdirSync(installedDir, { recursive: true });
  fs.writeFileSync(path.join(installedDir, "SKILL.md"), "whatever");
  assert.deepEqual(checkSkillStatus(bionicPreset, true, "find-images", { projectRoot, homeDir }), { state: "current" });
});

test("checkSkillStatus checks the shared 'image-display' skill's own content, but still points installScriptPath at find-images' install scripts (image-display has none of its own)", () => {
  const projectRoot = makeProjectRoot("image-display content", "bionic", "image-display");
  const homeDir = makeHomeDir();
  const status = checkSkillStatus(bionicPreset, true, "image-display", { projectRoot, homeDir });
  assert.equal(status.state, "not-installed");
  assert.ok("installScriptPath" in status && status.installScriptPath.includes(path.join("skills", "find-images", "install", "install_bionic_skills.sh")));
});

test("checkSkillStatus treats 'find-images' and 'image-display' as independent — one current, one stale", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "find-images-skillstatus-dual-"));
  fs.mkdirSync(path.join(projectRoot, "skills", "find-images"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "skills", "find-images", "SKILL.bionic.md"), "fi content");
  fs.mkdirSync(path.join(projectRoot, "skills", "image-display"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "skills", "image-display", "SKILL.bionic.md"), "new id content");
  const homeDir = makeHomeDir();
  fs.mkdirSync(path.join(homeDir, ".lmstudio", "skills", "find-images"), { recursive: true });
  fs.writeFileSync(path.join(homeDir, ".lmstudio", "skills", "find-images", "SKILL.md"), "fi content");
  fs.mkdirSync(path.join(homeDir, ".lmstudio", "skills", "image-display"), { recursive: true });
  fs.writeFileSync(path.join(homeDir, ".lmstudio", "skills", "image-display", "SKILL.md"), "old id content");

  assert.deepEqual(checkSkillStatus(bionicPreset, true, "find-images", { projectRoot, homeDir }), { state: "current" });
  assert.equal(checkSkillStatus(bionicPreset, true, "image-display", { projectRoot, homeDir }).state, "stale");
});

test("createSkillNoticeProvider returns the notice exactly once, then undefined", () => {
  const getNotice = createSkillNoticeProvider({ state: "not-installed", installScriptPath: "/repo/skills/find-images/install/install_bionic_skills.sh" }, "find-images");
  const first = getNotice();
  assert.ok(first?.includes("'find-images'"));
  assert.ok(first?.includes("install_bionic_skills.sh"));
  assert.ok(first?.includes("USE_SKILLS=false"));
  assert.equal(getNotice(), undefined);
  assert.equal(getNotice(), undefined);
});

test("createSkillNoticeProvider mentions re-running the install script for a stale skill", () => {
  const getNotice = createSkillNoticeProvider({ state: "stale", installScriptPath: "/repo/skills/find-images/install/install_unsloth_skills.sh" }, "find-images");
  const first = getNotice();
  assert.ok(first?.includes("out of date"));
  assert.ok(first?.includes("install_unsloth_skills.sh"));
  assert.equal(getNotice(), undefined);
});

test("createSkillNoticeProvider names 'image-display' when checking that skill", () => {
  const getNotice = createSkillNoticeProvider({ state: "not-installed", installScriptPath: "/repo/skills/find-images/install/install_bionic_skills.sh" }, "image-display");
  assert.ok(getNotice()?.includes("'image-display'"));
});

test("createSkillNoticeProvider never produces a notice for disabled or current — for the repo's own skill", () => {
  assert.equal(createSkillNoticeProvider({ state: "disabled" }, "find-images")(), undefined);
  assert.equal(createSkillNoticeProvider({ state: "current" }, "find-images")(), undefined);
});

test("createSkillNoticeProvider still reminds once for 'image-display' even when current — a passive SKILL.md mention alone wasn't enough in real Bionic traces", () => {
  const getNotice = createSkillNoticeProvider({ state: "current" }, "image-display");
  const first = getNotice();
  assert.ok(first?.includes("'image-display'"));
  assert.ok(first?.includes("once this session"));
  assert.equal(getNotice(), undefined);
});

test("createSkillNoticeProvider never reminds for 'image-display' when disabled", () => {
  assert.equal(createSkillNoticeProvider({ state: "disabled" }, "image-display")(), undefined);
});

