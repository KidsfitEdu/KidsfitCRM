param(
    [string] $AdminConnectionString = $env:KIDSFIT_TEST_MYSQL_ADMIN
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($AdminConnectionString)) {
    throw 'Set KIDSFIT_TEST_MYSQL_ADMIN to a local MySQL 8.4 account with CREATE/DROP DATABASE permission.'
}

$previousConnection = $env:KIDSFIT_TEST_MYSQL_ADMIN
$testExitCode = 1
try {
    $env:KIDSFIT_TEST_MYSQL_ADMIN = $AdminConnectionString
    dotnet test (Join-Path $PSScriptRoot 'KidsfitCRM.slnx') --configuration Release
    $testExitCode = $LASTEXITCODE
}
finally {
    $env:KIDSFIT_TEST_MYSQL_ADMIN = $previousConnection
}
exit $testExitCode
