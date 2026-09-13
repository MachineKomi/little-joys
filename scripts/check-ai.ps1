[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Push-Location $taskRoot
try {
    & (Join-Path $PSScriptRoot 'bmad-python.ps1') scripts/check-ai.py
} finally { Pop-Location }
