#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/.."
TARGET_DIR="$HOME/.agents/skills/find-images"

if [[ ! -f "$SOURCE_DIR/SKILL.unsloth.md" ]]; then
  echo "error: $SOURCE_DIR/SKILL.unsloth.md not found" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_DIR/SKILL.unsloth.md" "$TARGET_DIR/SKILL.md"

for entry in "$SOURCE_DIR"/*/; do
  name="$(basename "$entry")"
  [[ "$name" == "install" ]] && continue
  rm -rf "${TARGET_DIR:?}/$name"
  cp -R "$entry" "$TARGET_DIR/$name"
done

echo "Installed skill 'find-images' (Unsloth variant) to $TARGET_DIR"

SHARED_SOURCE_DIR="$SOURCE_DIR/../image-display"
SHARED_TARGET_DIR="$HOME/.agents/skills/image-display"
if [[ -f "$SHARED_SOURCE_DIR/SKILL.unsloth.md" ]]; then
  mkdir -p "$SHARED_TARGET_DIR"
  cp "$SHARED_SOURCE_DIR/SKILL.unsloth.md" "$SHARED_TARGET_DIR/SKILL.md"
  for entry in "$SHARED_SOURCE_DIR"/*/; do
    name="$(basename "$entry")"
    [[ "$name" == "install" ]] && continue
    rm -rf "${SHARED_TARGET_DIR:?}/$name"
    cp -R "$entry" "$SHARED_TARGET_DIR/$name"
  done
  echo "Installed skill 'image-display' (Unsloth variant) to $SHARED_TARGET_DIR"
else
  echo "warning: shared skill 'image-display' not found at $SHARED_SOURCE_DIR — skipping" >&2
fi
