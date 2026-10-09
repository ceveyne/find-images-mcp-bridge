#!/usr/bin/env pwsh
# Installs/updates the 'find-images' skill for Unsloth Studio.
#
# Unsloth Studio only lets you create/edit/delete skills in its own UI, saved under
# ~/.agents/skills — it has no "install from folder" import. This script copies the already
# client-agnostic tools/<tool>.md files plus the Unsloth-specific SKILL.unsloth.md (renamed to the
# only name Unsloth will load, SKILL.md) into that location instead.
#
# Safe to re-run after an update: this script always overwrites SKILL.md and every real subfolder
# in the target with the current content of this repo's skills/find-images/ folder.
# NOTE: this Windows port mirrors install_unsloth_skills.sh but is itself unverified on Windows.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SourceDir = Join-Path $PSScriptRoot ".."
$TargetDir = Join-Path (Join-Path (Join-Path $HOME ".agents") "skills") "find-images"

$SourceSkillFile = Join-Path $SourceDir "SKILL.unsloth.md"
if (-not (Test-Path $SourceSkillFile -PathType Leaf)) {
    Write-Error "error: $SourceSkillFile not found"
    exit 1
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path $SourceSkillFile -Destination (Join-Path $TargetDir "SKILL.md") -Force

# Only real subfolders (e.g. tools/) are copied — never the sibling SKILL.bionic.md/
# SKILL.generic.md source files, or this script's own install/ folder.
Get-ChildItem -Path $SourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
    $destSub = Join-Path $TargetDir $_.Name
    if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
    Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
}

Write-Output "Installed skill 'find-images' (Unsloth variant) to $TargetDir"

# Also install the shared 'image-display' skill (cross-plugin result-visibility guidance).
$SharedSourceDir = Join-Path $SourceDir "../image-display"
$SharedTargetDir = Join-Path (Join-Path (Join-Path $HOME ".agents") "skills") "image-display"
$SharedSourceSkillFile = Join-Path $SharedSourceDir "SKILL.unsloth.md"
if (Test-Path $SharedSourceSkillFile -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path $SharedTargetDir | Out-Null
    Copy-Item -Path $SharedSourceSkillFile -Destination (Join-Path $SharedTargetDir "SKILL.md") -Force
    Get-ChildItem -Path $SharedSourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
        $destSub = Join-Path $SharedTargetDir $_.Name
        if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
        Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
    }
    Write-Output "Installed skill 'image-display' (Unsloth variant) to $SharedTargetDir"
} else {
    Write-Warning "shared skill 'image-display' not found at $SharedSourceSkillFile — skipping"
}
