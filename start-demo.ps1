$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $projectRoot 'frontend'

Set-Location -LiteralPath $frontendPath
$env:NEXT_PUBLIC_API_URL = ''

if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules'))) {
    npm install
}

Write-Host 'Kidsfit CRM đang mở tại http://localhost:3000' -ForegroundColor Cyan
npm run dev
