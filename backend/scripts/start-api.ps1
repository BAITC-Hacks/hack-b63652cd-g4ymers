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
# Oracle's javapath launcher starts a child process, so its PID is not the API PID.
# Resolve the active runtime before Start-Process to track the actual Java server.
$javaLauncher = (Get-Command java -CommandType Application | Select-Object -First 1).Source
$javaProperties = & {
    $ErrorActionPreference = 'Continue'
    & $javaLauncher -XshowSettings:properties -version 2>&1
}
$javaHomeMatch = $javaProperties | ForEach-Object { $_.ToString() } | Select-String '^\s*java\.home\s*=\s*(.+)$' | Select-Object -First 1
if (!$javaHomeMatch) { throw 'Cannot determine the active Java runtime. Install Java 21 or newer.' }
$javaExecutable = Join-Path $javaHomeMatch.Matches[0].Groups[1].Value.Trim() 'bin/java.exe'
if (!(Test-Path -LiteralPath $javaExecutable -PathType Leaf)) { throw "Java executable not found: $javaExecutable" }
if ($Background) {
    $process = Start-Process -FilePath $javaExecutable -ArgumentList @('-jar', ('"' + $jarPath + '"')) -WindowStyle Hidden -PassThru -WorkingDirectory $projectRoot -RedirectStandardOutput (Join-Path $projectRoot '.local/api.log') -RedirectStandardError (Join-Path $projectRoot '.local/api-error.log')
    $process.Id | Set-Content -LiteralPath (Join-Path $projectRoot '.local/api.pid')
    Write-Output "API starting in background, PID $($process.Id). Logs: .local/api.log"
} else {
    & $javaExecutable -jar $jarPath
}
