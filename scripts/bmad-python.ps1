# The Toy Studio resolvers use only Python 3.11+ stdlib; no global installation.
[CmdletBinding()]
param([Parameter(Mandatory=$true, Position=0, ValueFromRemainingArguments=$true)][string[]]$ScriptArguments)
$ErrorActionPreference = 'Stop'
$taskCandidates = @(
    $env:LITTLE_JOYS_PYTHON,
    (Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe')
)
$taskPython = $null
foreach ($taskCandidate in $taskCandidates) {
    if ($taskCandidate -and (Test-Path -LiteralPath $taskCandidate)) {
        & $taskCandidate -B -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)'
        if ($LASTEXITCODE -eq 0) { $taskPython = $taskCandidate; break }
    }
}
if (-not $taskPython) { throw 'Set LITTLE_JOYS_PYTHON to an existing Python 3.11+ executable. No interpreter is installed globally by this helper.' }
$taskOldEncoding = $env:PYTHONIOENCODING
try {
    $env:PYTHONIOENCODING = 'utf-8'
    & $taskPython -B @ScriptArguments
    if ($LASTEXITCODE -ne 0) { throw "BMAD resolver exited $LASTEXITCODE" }
} finally { $env:PYTHONIOENCODING = $taskOldEncoding }
