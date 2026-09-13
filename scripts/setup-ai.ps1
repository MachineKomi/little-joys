# Pinned development-only BMAD installation in THIS checkout, never another worktree.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Get-Command npx.cmd -ErrorAction Stop | Out-Null
& (Join-Path $PSScriptRoot 'bmad-python.ps1') -c 'import sys; print("Python resolver runtime ready")'
Push-Location $taskRoot
try {
    & npx.cmd --yes bmad-method@6.12.0 install --directory $taskRoot --modules bmm --tools codex,claude-code --no-shims --user-name Human --communication-language English --document-output-language English --output-folder .local/toy-studio-output --set core.project_name=little-joys --yes
    if ($LASTEXITCODE -ne 0) { throw 'BMAD installation failed.' }
    & (Join-Path $PSScriptRoot 'check-ai.ps1')
} finally { Pop-Location }
Write-Output 'Toy Studio setup verified. No sprint, commit, merge or deployment was started.'
