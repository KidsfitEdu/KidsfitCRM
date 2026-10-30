param(
    [Parameter(Mandatory = $true)][string] $DatabaseName,
    [Parameter(Mandatory = $true)][string] $MySqlHost,
    [Parameter(Mandatory = $true)][ValidateRange(1,65535)][int] $Port,
    [Parameter(Mandatory = $true)][string] $AdminUser,
    [Parameter(Mandatory = $true)][string] $BackupDirectory,
    [Parameter(Mandatory = $true)][string] $ConfirmDatabaseName
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($DatabaseName -cne $ConfirmDatabaseName) { throw 'Database confirmation does not match.' }
if ($DatabaseName -notmatch '^[A-Za-z0-9_]+$') { throw 'Unsafe database identifier.' }
if ($DatabaseName -notmatch '(^|_)(demo|test|dev)($|_)') {
    throw 'Refusing to reset a database without an explicit demo/test/dev name.'
}
if ($MySqlHost -notin @('localhost','127.0.0.1')) {
    throw 'Reset is restricted to local MySQL. This is not a production cleanup script.'
}
if ($DatabaseName -in @('mysql','information_schema','performance_schema','sys')) {
    throw 'System database cannot be reset.'
}
foreach ($tool in @('mysql','mysqldump')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool is not available in PATH."
    }
}
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path (Resolve-Path $BackupDirectory).Path "$DatabaseName-$stamp.sql"
$adminArgs = @('--protocol=tcp', "--host=$MySqlHost", "--port=$Port", "--user=$AdminUser")
Write-Host "Preparing backup for local DEMO database: $DatabaseName" -ForegroundColor Yellow
Write-Host 'MySQL clients will read credentials from your login-path / interactive prompt. Do not put credentials in arguments or source.' -ForegroundColor Yellow
# mysqldump emits UTF-8 SQL. Its process exit code is checked BEFORE any destructive statement.
& mysqldump @adminArgs --single-transaction --routines --triggers --events --no-tablespaces $DatabaseName > $backup
if ($LASTEXITCODE -ne 0) { throw "Backup failed; database not changed: $backup" }
if ((Get-Item $backup).Length -lt 128) { throw "Backup unexpectedly small; database not changed: $backup" }
Write-Host "Backup created: $backup" -ForegroundColor Green
Write-Host 'No DROP was executed. Restore-test this dump on a separate disposable MySQL database before any reset.' -ForegroundColor Yellow
Write-Host 'Migration history will NOT be deleted by this script. Create and validate the replacement EF migration first.' -ForegroundColor Yellow
