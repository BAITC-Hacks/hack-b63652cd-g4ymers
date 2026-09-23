param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$localDir = Join-Path $projectRoot '.local'
$dataDir = Join-Path $localDir 'postgres'
New-Item -ItemType Directory -Force $localDir | Out-Null
$configPath = Join-Path $localDir 'dev-config.json'
if (!(Test-Path -LiteralPath $configPath)) {
    $config = @{
        databasePassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
        akimEmail = 'akim@example.kz'
        akimPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
        databasePort = 55432
    }
    $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
}
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if (!(Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
    $passwordFile = Join-Path $localDir 'pg-init-password'
    [IO.File]::WriteAllText($passwordFile, $config.databasePassword)
    try {
        & (Join-Path $PostgresBin 'initdb.exe') -D $dataDir -U hackalem --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$passwordFile
        if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
    } finally { Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue }
}
& (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDir status *> $null
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDir -l (Join-Path $localDir 'postgres.log') -o "-p $($config.databasePort) -h 127.0.0.1" -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed' }
}
$oldPgPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $config.databasePassword
    $exists = & (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p $config.databasePort -U hackalem -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='hackalem'"
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL connection failed' }
    if ($exists -ne '1') {
        & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $config.databasePort -U hackalem hackalem
        if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
    }
} finally { $env:PGPASSWORD = $oldPgPassword }
Write-Output "PostgreSQL ready on 127.0.0.1:$($config.databasePort), database hackalem. Local credentials: .local/dev-config.json (gitignored)."
