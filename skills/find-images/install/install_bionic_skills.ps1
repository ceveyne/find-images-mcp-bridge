#!/usr/bin/env pwsh
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

Get-ChildItem -Path $SourceDir -Directory | Where-Object { $_.Name -ne "install" } | ForEach-Object {
    $destSub = Join-Path $TargetDir $_.Name
    if (Test-Path $destSub) { Remove-Item -Recurse -Force $destSub }
    Copy-Item -Path $_.FullName -Destination $destSub -Recurse -Force
}

Write-Output "Installed skill 'find-images' (Bionic variant) to $TargetDir"

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
