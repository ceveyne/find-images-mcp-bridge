#!/usr/bin/env bash
# Installs/updates the 'find-images' skill for LM Studio Bionic by copying it directly to
# ~/.lmstudio/skills, bypassing Bionic's "Skills > Install a skill > Select a folder" UI flow.
#
# Bionic "installs" a skill simply by having it present under ~/.lmstudio/skills — copying it
# there directly works the same as using the UI flow, regardless of whether Bionic is running.
# Bionic's installed-skills tracking does not appear to apply to skills placed here; however,
# updating the files under this repo's skills/find-images folder afterward does NOT propagate
# automatically — re-run this script to pick up changes.
set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/.."
TARGET_DIR="$HOME/.lmstudio/skills/find-images"

if [[ ! -f "$SOURCE_DIR/SKILL.bionic.md" ]]; then
  echo "error: $SOURCE_DIR/SKILL.bionic.md not found" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_DIR/SKILL.bionic.md" "$TARGET_DIR/SKILL.md"

# Only real subfolders (e.g. tools/) are copied — never the sibling SKILL.unsloth.md/
# SKILL.generic.md source files, or this script's own install/ folder.
for entry in "$SOURCE_DIR"/*/; do
  name="$(basename "$entry")"
  [[ "$name" == "install" ]] && continue
  rm -rf "${TARGET_DIR:?}/$name"
  cp -R "$entry" "$TARGET_DIR/$name"
done

echo "Installed skill 'find-images' (Bionic variant) to $TARGET_DIR"

# Also install the shared 'image-display' skill (cross-plugin result-visibility guidance).
SHARED_SOURCE_DIR="$SOURCE_DIR/../image-display"
SHARED_TARGET_DIR="$HOME/.lmstudio/skills/image-display"
if [[ -f "$SHARED_SOURCE_DIR/SKILL.bionic.md" ]]; then
  mkdir -p "$SHARED_TARGET_DIR"
  cp "$SHARED_SOURCE_DIR/SKILL.bionic.md" "$SHARED_TARGET_DIR/SKILL.md"
  for entry in "$SHARED_SOURCE_DIR"/*/; do
    name="$(basename "$entry")"
    [[ "$name" == "install" ]] && continue
    rm -rf "${SHARED_TARGET_DIR:?}/$name"
    cp -R "$entry" "$SHARED_TARGET_DIR/$name"
  done
  echo "Installed skill 'image-display' (Bionic variant) to $SHARED_TARGET_DIR"
else
  echo "warning: shared skill 'image-display' not found at $SHARED_SOURCE_DIR — skipping" >&2
fi
