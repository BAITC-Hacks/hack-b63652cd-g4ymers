$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$config = Get-Content -LiteralPath (Join-Path $projectRoot '.local/dev-config.json') -Raw | ConvertFrom-Json
$bin = 'C:\Program Files\PostgreSQL\18\bin'
$env:PGPASSWORD = $config.databasePassword
$exists = & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p $config.databasePort -U hackalem -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='hackalem_test'"
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL is not running. Run start-local-db.ps1 first.' }
if ($exists -ne '1') {
    & (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p $config.databasePort -U hackalem hackalem_test
    if ($LASTEXITCODE -ne 0) { throw 'Test database creation failed' }
}
$env:PGPASSWORD = $null
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:$($config.databasePort)/hackalem_test"
$env:DATABASE_USER = 'hackalem'
$env:DATABASE_PASSWORD = $config.databasePassword
$env:AKIM_EMAIL = $config.akimEmail
$env:AKIM_PASSWORD = $config.akimPassword
$env:INTEGRATION_TESTS = 'true'
Push-Location (Join-Path $projectRoot 'backend')
try {
    & .\mvnw.cmd -B test
    if ($LASTEXITCODE -ne 0) { throw 'Integration tests failed' }
} finally { Pop-Location }
