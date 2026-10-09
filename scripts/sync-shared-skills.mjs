#!/usr/bin/env node
/**
 * scripts/sync-shared-skills.mjs — Sync the cross-plugin 'image-display' skill from
 * made-for-bionic-core into skills/image-display.
 *
 * Canonical source: made-for-bionic-core/skills/image-display. Byte-identical copy, a plain
 * directory copy, no build step.
 *
 * Usage:
 *   node scripts/sync-shared-skills.mjs
 */

import fs from "node:fs";
import path from "node:path";

const SCRIPTS_DIR = path.resolve(import.meta.dirname);
const PROJECT     = path.resolve(SCRIPTS_DIR, "..");
const CORE_ROOT   = path.resolve(PROJECT, "..", "made-for-bionic-core");
const SOURCE      = path.join(CORE_ROOT, "skills", "image-display");
const TARGET      = path.join(PROJECT, "skills", "image-display");

function log(msg) { console.log(`[sync-shared-skills] ${msg}`); }
function die(msg) { console.error(`[sync-shared-skills] FATAL: ${msg}`); process.exit(1); }

if (!fs.existsSync(SOURCE)) {
  die(`${SOURCE} not found. Is made-for-bionic-core set up?`);
}

fs.rmSync(TARGET, { recursive: true, force: true });
fs.cpSync(SOURCE, TARGET, { recursive: true });
log("image-display -> skills/image-display");

log("sync complete");
