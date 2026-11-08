$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '../contracts')).Path
$rpc = 'http://127.0.0.1:8545'
function Get-LocalChainId {
    $request = '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
    try { (Invoke-RestMethod -Uri $rpc -Method Post -ContentType 'application/json' -Body $request -TimeoutSec 2).result }
    catch { $null }
}
$process = $null
Push-Location $project
try {
    $chain = Get-LocalChainId
    if (-not $chain) {
        # Hardhat prints development private keys at startup. Discard node output.
        $process = Start-Process -FilePath $env:ComSpec -ArgumentList '/d /c node node_modules/hardhat/internal/cli/cli.js node --hostname 127.0.0.1 >NUL 2>&1' -WorkingDirectory $project -WindowStyle Hidden -PassThru
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            if ($process.HasExited) { throw 'Local node exited during startup.' }
            $chain = Get-LocalChainId
            if ($chain) { break }
            Start-Sleep -Milliseconds 500
        }
    }
    if ($chain -ne '0x7a69') { throw 'Expected local chain ID 31337 on port 8545.' }
    & npx.cmd --no-install hardhat run scripts/deploy.ts --network localhost
    if ($LASTEXITCODE -ne 0) { throw 'Local deployment failed.' }
    if ($process) { Write-Output "To stop this node: taskkill /PID $($process.Id) /T /F" }
}
catch {
    if ($process -and -not $process.HasExited) { taskkill /PID $process.Id /T /F | Out-Null }
    throw
}
finally { Pop-Location }
