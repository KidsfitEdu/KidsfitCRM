# Destructive local-demo reset. User explicitly approved disposing all demo data, without backup.
# Never invoke against production/shared MySQL.
param(
    [Parameter(Mandatory=$true)][string]$DatabaseName,
    [Parameter(Mandatory=$true)][string]$ConfirmDatabaseName
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($DatabaseName -cne $ConfirmDatabaseName) { throw 'Database confirmation mismatch.' }
if ($DatabaseName -notmatch '^[A-Za-z0-9_]+$') { throw 'Invalid database identifier.' }
if ($DatabaseName -in @('mysql','information_schema','performance_schema','sys')) { throw 'System database is forbidden.' }
if ($env:ASPNETCORE_ENVIRONMENT -ne 'Development') { throw 'Only ASPNETCORE_ENVIRONMENT=Development is allowed.' }
if ($env:Seed__DisposableDatabase -ne 'true') { throw 'Explicit Seed__DisposableDatabase=true is required.' }
if ([string]::IsNullOrWhiteSpace($env:Seed__DemoPassword)) { throw 'Seed__DemoPassword must be set privately.' }
if ([string]::IsNullOrWhiteSpace($env:ConnectionStrings__MySql)) { throw 'ConnectionStrings__MySql must be set in process environment.' }
$builder = [System.Data.Common.DbConnectionStringBuilder]::new()
$builder.ConnectionString = $env:ConnectionStrings__MySql
$actualDb = $null
foreach ($key in @('Database', 'Initial Catalog')) {
    if ($builder.ContainsKey($key)) { $actualDb = [string]$builder[$key]; break }
}
if ($actualDb -cne $DatabaseName) { throw "Configured database '$actualDb' does not match confirmed target '$DatabaseName'." }
$hostName = $null
foreach ($key in @('Server','Host','Data Source')) {
    if ($builder.ContainsKey($key)) { $hostName = [string]$builder[$key]; break }
}
if ($hostName -notin @('127.0.0.1','localhost')) { throw 'Only local MySQL is allowed.' }
if ($DatabaseName -notmatch '(demo|test|dev)' -and $DatabaseName -cne 'kidsfit_crm') {
    throw 'Database is not an explicitly recognized CRM demo name.'
}
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw 'dotnet SDK is not installed.' }
$backendPath = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $backendPath
try {
    Write-Host "Confirmed LOCAL DEMO database: $DatabaseName. This deletes ALL of its tables and records. No backup will be made." -ForegroundColor Red
    dotnet ef database drop --force --context KidsfitDbContext --project src/KidsfitCRM.Api --startup-project src/KidsfitCRM.Api
    if ($LASTEXITCODE -ne 0) { throw 'EF database drop failed; no migration or seed attempted.' }
    dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
    if ($LASTEXITCODE -ne 0) { throw 'InitialCRM migration or demo seed failed.' }
    Write-Host "Reset and seed completed: $DatabaseName" -ForegroundColor Green
}
finally { Pop-Location }
