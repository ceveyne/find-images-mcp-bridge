#!/usr/bin/env pwsh
# Installs/updates the 'find-images' skill for a generic MCP client.
#
# UNVERIFIED: it's not confirmed whether any given generic/third-party MCP client supports skills
# at all, or — if it does — whether it reads from ~/.agents/skills. That path is used by both
# Unsloth Studio and VS Code Copilot, so it's a reasonable guess, not a confirmed convention for
# every client. Only run this if your client is known to read skills from ~/.agents/skills.
#
# Safe to re-run after an update: this script always overwrites SKILL.md and every real subfolder
# in the target with the current content of this repo's skills/find-images/ folder.
# NOTE: this Windows port mirrors install_generic_skills.sh but is itself unverified on Windows.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SourceDir = Join-Path $PSScriptRoot ".."
$TargetDir = Join-Path (Join-Path (Join-Path $HOME ".agents") "skills") "find-images"

$SourceSkillFile = Join-Path $SourceDir "SKILL.generic.md"
if (-not (Test-Path $SourceSkillFile -PathType Leaf)) {
    Write-Error "error: $SourceSkillFile not found"
    exit 1
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path $SourceSkillFile -Destination (Join-Path $TargetDir "SKILL.md") -Force

# Only real subfolders (e.g. tools/) are copied — never the sibling SKILL.bionic.md/
# SKILL.unsloth.md source files, or this script's own install/ folder.
Get-ChildItem -Path $SourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
    $destSub = Join-Path $TargetDir $_.Name
    if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
    Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
}

Write-Output "Installed skill 'find-images' (generic variant) to $TargetDir"

# Also install the shared 'image-display' skill (cross-plugin result-visibility guidance).
$SharedSourceDir = Join-Path $SourceDir "../image-display"
$SharedTargetDir = Join-Path (Join-Path (Join-Path $HOME ".agents") "skills") "image-display"
$SharedSourceSkillFile = Join-Path $SharedSourceDir "SKILL.generic.md"
if (Test-Path $SharedSourceSkillFile -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path $SharedTargetDir | Out-Null
    Copy-Item -Path $SharedSourceSkillFile -Destination (Join-Path $SharedTargetDir "SKILL.md") -Force
    Get-ChildItem -Path $SharedSourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
        $destSub = Join-Path $SharedTargetDir $_.Name
        if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
        Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
    }
    Write-Output "Installed skill 'image-display' (generic variant) to $SharedTargetDir"
} else {
    Write-Warning "shared skill 'image-display' not found at $SharedSourceSkillFile — skipping"
}
