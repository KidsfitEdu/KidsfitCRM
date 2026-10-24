$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot 'backend'
$frontendPath = Join-Path $projectRoot 'frontend'
$runtimePath = Join-Path $projectRoot '.runtime'
$mysqlDataPath = Join-Path $runtimePath 'mysql-data-net10'
$mysqlRoot = 'C:\Program Files\MySQL\MySQL Server 8.4'
$mysqlServer = Join-Path $mysqlRoot 'bin\mysqld.exe'
$mysqlClient = Join-Path $mysqlRoot 'bin\mysql.exe'
$mysqlPort = 3307
$databaseName = 'kidsfit_crm'
$databaseUser = 'kidsfit_crm'
$databasePassword = 'kidsfit_secret'

function Wait-ForPort([int] $port, [int] $attempts = 60) {
    for ($attempt = 0; $attempt -lt $attempts; $attempt++) {
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "Service did not open port $port. Check logs in $runtimePath."
}

if (-not (Test-Path -LiteralPath $mysqlServer) -or -not (Test-Path -LiteralPath $mysqlClient)) {
    throw 'MySQL Server 8.4 was not found at C:\Program Files\MySQL\MySQL Server 8.4.'
}
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 10 SDK is required.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js 22+ is required.' }

New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $mysqlDataPath 'mysql'))) {
    New-Item -ItemType Directory -Path $mysqlDataPath -Force | Out-Null
    & $mysqlServer --no-defaults --initialize-insecure "--basedir=$mysqlRoot" "--datadir=$mysqlDataPath"
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the MySQL data directory.' }
}

if (-not (Get-NetTCPConnection -LocalPort $mysqlPort -State Listen -ErrorAction SilentlyContinue)) {
    $mysqlArguments = @(
        '--no-defaults', "`"--basedir=$mysqlRoot`"", "--datadir=$mysqlDataPath", "--port=$mysqlPort",
        '--bind-address=127.0.0.1', '--mysqlx=0', '--character-set-server=utf8mb4',
        '--collation-server=utf8mb4_0900_ai_ci', '--default-time-zone=+00:00',
        "--log-error=$(Join-Path $mysqlDataPath 'kidsfit-mysql.err')", "--pid-file=$(Join-Path $mysqlDataPath 'kidsfit-mysql.pid')"
    )
    Start-Process -FilePath $mysqlServer -ArgumentList $mysqlArguments -WindowStyle Hidden | Out-Null
    Wait-ForPort $mysqlPort
}

$rootArguments = @('--protocol=tcp', '--host=127.0.0.1', "--port=$mysqlPort", '--user=root', '--batch', '--skip-column-names')
$env:MYSQL_PWD = $databasePassword
& $mysqlClient @rootArguments --execute="SELECT 1" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    & $mysqlClient @rootArguments --execute="SELECT 1" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not authenticate with the project MySQL root account.' }
}

$databaseSql = @"
CREATE DATABASE IF NOT EXISTS ``$databaseName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '$databaseUser'@'127.0.0.1' IDENTIFIED WITH caching_sha2_password BY '$databasePassword';
ALTER USER '$databaseUser'@'127.0.0.1' IDENTIFIED WITH caching_sha2_password BY '$databasePassword';
GRANT ALL PRIVILEGES ON ``$databaseName``.* TO '$databaseUser'@'127.0.0.1';
ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY '$databasePassword';
FLUSH PRIVILEGES;
"@
& $mysqlClient @rootArguments --execute=$databaseSql
$mysqlExitCode = $LASTEXITCODE
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
if ($mysqlExitCode -ne 0) { throw 'Could not provision the Kidsfit CRM database.' }

if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules'))) {
    Push-Location $frontendPath
    try { npm install } finally { Pop-Location }
}
if (-not (Test-Path -LiteralPath (Join-Path $frontendPath '.env.local'))) {
    Copy-Item -LiteralPath (Join-Path $frontendPath '.env.example') -Destination (Join-Path $frontendPath '.env.local')
}

$env:ConnectionStrings__MySql = "Server=127.0.0.1;Port=$mysqlPort;Database=$databaseName;User=$databaseUser;Password=$databasePassword;Character Set=utf8mb4;"
$env:Jwt__Issuer = 'KidsfitCRM.Api'
$env:Jwt__Audience = 'KidsfitCRM.Web'
$env:Jwt__Key = 'local-development-key-change-before-production-2026'
$env:Cors__Origins__0 = 'http://localhost:3000'
Push-Location $backendPath
try { dotnet run --project src/KidsfitCRM.Api --no-launch-profile -- --migrate --seed-demo } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw 'Database migration or seed failed.' }

if (-not (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)) {
    $dotnetExecutable = (Get-Command dotnet -ErrorAction Stop).Source
    Start-Process -FilePath $dotnetExecutable -ArgumentList @('run', '--project', 'src/KidsfitCRM.Api', '--no-launch-profile', '--', '--urls', 'http://127.0.0.1:8000') -WorkingDirectory $backendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'api-output.log') -RedirectStandardError (Join-Path $runtimePath 'api-error.log') | Out-Null
    Wait-ForPort 8000
}

if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
    $npmExecutable = (Get-Command npm.cmd -ErrorAction Stop).Source
    Start-Process -FilePath $npmExecutable -ArgumentList @('run', 'dev') -WorkingDirectory $frontendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'web-output.log') -RedirectStandardError (Join-Path $runtimePath 'web-error.log') | Out-Null
    Wait-ForPort 3000
}

Write-Host 'Kidsfit CRM is running at http://localhost:3000' -ForegroundColor Cyan
Write-Host 'ASP.NET Core API: http://localhost:8000 | MySQL 8.4: 127.0.0.1:3307' -ForegroundColor DarkGray
