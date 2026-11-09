$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    $python = Join-Path $PWD '.venv\Scripts\python.exe'
    if (-not (Test-Path -LiteralPath $python)) {
        Write-Output 'FAIL Python | backend\.venv is missing. Follow docs\DEMO_CHECKLIST.md.'
        exit 1
    }
    & $python -m scripts.prepare_demo
    $result = $LASTEXITCODE
}
finally { Pop-Location }
exit $result
