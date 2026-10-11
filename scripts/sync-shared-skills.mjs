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

// skills/image-display is committed to this repo, so a plain `git clone` already has a working
// copy — made-for-bionic-core is only a maintainer-side sibling for refreshing it. Skip (not
// fail) the build when it's absent, so a regular end-user clone+build never breaks on this.
if (!fs.existsSync(SOURCE)) {
  process.exit(0);
}

fs.rmSync(TARGET, { recursive: true, force: true });
fs.cpSync(SOURCE, TARGET, { recursive: true });
log("image-display -> skills/image-display");

log("sync complete");
