#!/usr/bin/env node
/**
 * scripts/sync-core.mjs — Sync the pre-built core bundle + its type declarations into src/
 *
 * made-for-bionic-core has NO git remote (never pushed anywhere), so this bridge's own repo
 * must carry a fully self-contained, committed copy of everything it needs from it — a fresh
 * `git clone` + `npm install` of THIS repo alone must never require the sibling to exist.
 * This script is therefore a manual, explicit maintenance step (run + commit the result
 * whenever made-for-bionic-core changes) — it is deliberately NOT invoked by `npm run build`.
 *
 * Copies:
 *   made-for-bionic-core/dist/core-bundle.mjs → src/core-bundle.mjs   (runtime)
 *   made-for-bionic-core/dist/**\/*.d.ts       → src/core-types/**   (types, minus tests)
 *
 * Usage:
 *   node scripts/sync-core.mjs           # one-shot sync
 *   node scripts/sync-core.mjs --build   # rebuild core first, then sync
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const SCRIPTS_DIR = path.resolve(import.meta.dirname);
const PROJECT     = path.resolve(SCRIPTS_DIR, "..");
const CORE_ROOT   = path.resolve(PROJECT, "..", "made-for-bionic-core");
const CORE_DIST   = path.join(CORE_ROOT, "dist");
const CORE_BUNDLE = path.join(CORE_DIST, "core-bundle.mjs");
const TARGET      = path.join(PROJECT, "src", "core-bundle.mjs");
const TYPES_DIR   = path.join(PROJECT, "src", "core-types");

function log(msg) { console.log(`[sync-core] ${msg}`); }
function die(msg) { console.error(`[sync-core] FATAL: ${msg}`); process.exit(1); }

function md5(filePath) {
  return createHash("md5").update(fs.readFileSync(filePath)).digest("hex").slice(0, 8);
}

const shouldBuild = process.argv.includes("--build");

if (!fs.existsSync(CORE_BUNDLE) || shouldBuild) {
  if (!fs.existsSync(CORE_BUNDLE)) {
    log("core-bundle.mjs not found — building…");
  } else {
    log("--build flag — rebuilding core…");
  }
  if (!fs.existsSync(path.join(CORE_ROOT, "bundle.mjs"))) {
    die(`${CORE_ROOT}/bundle.mjs not found. Is made-for-bionic-core set up?`);
  }
  execSync("npx tsc && node bundle.mjs", { cwd: CORE_ROOT, stdio: "inherit" });
}

if (!fs.existsSync(CORE_BUNDLE)) {
  die(`Build did not produce ${CORE_BUNDLE}`);
}

fs.copyFileSync(CORE_BUNDLE, TARGET);
log(`core-bundle.mjs → src/  (${md5(TARGET)})`);

/** Recursively copies every non-test *.d.ts from `srcDir` into `destDir`, stripping the
 *  `//# sourceMappingURL=` comment (the .d.ts.map files themselves are intentionally not
 *  copied — this bridge doesn't ship made-for-bionic-core's original .ts sources). */
function copyDeclarations(srcDir, destDir) {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += copyDeclarations(path.join(srcDir, entry.name), path.join(destDir, entry.name));
      continue;
    }
    if (!entry.name.endsWith(".d.ts") || entry.name.endsWith(".test.d.ts")) continue;
    const content = fs.readFileSync(path.join(srcDir, entry.name), "utf8")
      .replace(/\n\/\/# sourceMappingURL=.*\n?$/, "\n");
    fs.writeFileSync(path.join(destDir, entry.name), content, "utf8");
    count++;
  }
  return count;
}

const typeCount = copyDeclarations(CORE_DIST, TYPES_DIR);
log(`${typeCount} type declaration file(s) → src/core-types/`);

log("✓ sync complete");
