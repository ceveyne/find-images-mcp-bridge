#!/usr/bin/env pwsh
# Installs/updates the 'find-images' skill for LM Studio Bionic by copying it directly to
# ~/.lmstudio/skills, bypassing Bionic's "Skills > Install a skill > Select a folder" UI flow.
#
# Bionic "installs" a skill simply by having it present under ~/.lmstudio/skills — copying it
# there directly works the same as using the UI flow, regardless of whether Bionic is running.
# Bionic's installed-skills tracking does not appear to apply to skills placed here; however,
# updating the files under this repo's skills/find-images folder afterward does NOT propagate
# automatically — re-run this script to pick up changes.
# NOTE: this Windows port mirrors install_bionic_skills.sh but is itself unverified on Windows.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SourceDir = Join-Path $PSScriptRoot ".."
$TargetDir = Join-Path (Join-Path (Join-Path $HOME ".lmstudio") "skills") "find-images"

$SourceSkillFile = Join-Path $SourceDir "SKILL.bionic.md"
if (-not (Test-Path $SourceSkillFile -PathType Leaf)) {
    Write-Error "error: $SourceSkillFile not found"
    exit 1
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path $SourceSkillFile -Destination (Join-Path $TargetDir "SKILL.md") -Force

# Only real subfolders (e.g. tools/) are copied — never the sibling SKILL.unsloth.md/
# SKILL.generic.md source files, or this script's own install/ folder.
Get-ChildItem -Path $SourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
    $destSub = Join-Path $TargetDir $_.Name
    if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
    Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
}

Write-Output "Installed skill 'find-images' (Bionic variant) to $TargetDir"

# Also install the shared 'image-display' skill (cross-plugin result-visibility guidance).
$SharedSourceDir = Join-Path $SourceDir "../image-display"
$SharedTargetDir = Join-Path (Join-Path (Join-Path $HOME ".lmstudio") "skills") "image-display"
$SharedSourceSkillFile = Join-Path $SharedSourceDir "SKILL.bionic.md"
if (Test-Path $SharedSourceSkillFile -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path $SharedTargetDir | Out-Null
    Copy-Item -Path $SharedSourceSkillFile -Destination (Join-Path $SharedTargetDir "SKILL.md") -Force
    Get-ChildItem -Path $SharedSourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
        $destSub = Join-Path $SharedTargetDir $_.Name
        if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
        Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
    }
    Write-Output "Installed skill 'image-display' (Bionic variant) to $SharedTargetDir"
} else {
    Write-Warning "shared skill 'image-display' not found at $SharedSourceSkillFile — skipping"
}
