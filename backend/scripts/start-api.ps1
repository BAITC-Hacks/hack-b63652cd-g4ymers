param([switch]$Background)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$config = Get-Content -LiteralPath (Join-Path $projectRoot '.local/dev-config.json') -Raw | ConvertFrom-Json
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:$($config.databasePort)/hackalem"
$env:DATABASE_USER = 'hackalem'
$env:DATABASE_PASSWORD = $config.databasePassword
$env:AKIM_EMAIL = $config.akimEmail
$env:AKIM_PASSWORD = $config.akimPassword
$jarPath = Join-Path $projectRoot 'backend/target/city-api-0.1.0.jar'
if ($Background) {
    $process = Start-Process -FilePath (Get-Command java).Source -ArgumentList @('-jar', ('"' + $jarPath + '"')) -WindowStyle Hidden -PassThru -WorkingDirectory $projectRoot -RedirectStandardOutput (Join-Path $projectRoot '.local/api.log') -RedirectStandardError (Join-Path $projectRoot '.local/api-error.log')
    $process.Id | Set-Content -LiteralPath (Join-Path $projectRoot '.local/api.pid')
    Write-Output "API starting in background, PID $($process.Id). Logs: .local/api.log"
} else {
    & java -jar $jarPath
}
