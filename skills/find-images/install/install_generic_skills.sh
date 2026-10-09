#!/usr/bin/env bash
# Installs/updates the 'find-images' skill for a generic MCP client.
#
# UNVERIFIED: it's not confirmed whether any given generic/third-party MCP client supports skills
# at all, or — if it does — whether it reads from ~/.agents/skills. That path is used by both
# Unsloth Studio and VS Code Copilot, so it's a reasonable guess, not a confirmed convention for
# every client. Only run this if your client is known to read skills from ~/.agents/skills.
#
# Safe to re-run after an update: this script always overwrites SKILL.md and the tools/ folder in
# the target with the current content of this repo's skills/find-images/ folder.
set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/.."
TARGET_DIR="$HOME/.agents/skills/find-images"

if [[ ! -f "$SOURCE_DIR/SKILL.generic.md" ]]; then
  echo "error: $SOURCE_DIR/SKILL.generic.md not found" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_DIR/SKILL.generic.md" "$TARGET_DIR/SKILL.md"

# Only real subfolders (e.g. tools/) are copied — never the sibling SKILL.bionic.md/
# SKILL.unsloth.md source files, or this script's own install/ folder.
for entry in "$SOURCE_DIR"/*/; do
  name="$(basename "$entry")"
  [[ "$name" == "install" ]] && continue
  rm -rf "${TARGET_DIR:?}/$name"
  cp -R "$entry" "$TARGET_DIR/$name"
done

echo "Installed skill 'find-images' (generic variant) to $TARGET_DIR"

# Also install the shared 'image-display' skill (cross-plugin result-visibility guidance).
SHARED_SOURCE_DIR="$SOURCE_DIR/../image-display"
SHARED_TARGET_DIR="$HOME/.agents/skills/image-display"
if [[ -f "$SHARED_SOURCE_DIR/SKILL.generic.md" ]]; then
  mkdir -p "$SHARED_TARGET_DIR"
  cp "$SHARED_SOURCE_DIR/SKILL.generic.md" "$SHARED_TARGET_DIR/SKILL.md"
  for entry in "$SHARED_SOURCE_DIR"/*/; do
    name="$(basename "$entry")"
    [[ "$name" == "install" ]] && continue
    rm -rf "${SHARED_TARGET_DIR:?}/$name"
    cp -R "$entry" "$SHARED_TARGET_DIR/$name"
  done
  echo "Installed skill 'image-display' (generic variant) to $SHARED_TARGET_DIR"
else
  echo "warning: shared skill 'image-display' not found at $SHARED_SOURCE_DIR — skipping" >&2
fi
