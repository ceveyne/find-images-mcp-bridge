#!/usr/bin/env node
// Copies made-for-bionic-core/skills/image-display → skills/image-display.

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
