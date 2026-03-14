$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"

if (-not (Test-Path $backendPath)) {
  Write-Error "Backend folder not found: $backendPath"
}

Set-Location $backendPath

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Created backend/.env from .env.example"
  } else {
    Write-Error "Missing .env.example in backend/"
  }
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing backend dependencies..."
  npm.cmd install
}

$portInUse = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
  Write-Host "Backend is already running on port 4000."
  Write-Host "Health: http://localhost:4000/api/v1/health"
  exit 0
}

Write-Host "Starting backend on http://localhost:4000 ..."
npm.cmd run start
