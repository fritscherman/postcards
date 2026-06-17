# Postkarten - Deploy (Windows / pm2)
# Pulls the latest code, builds the frontend + backend and (re)starts the
# pm2 process. Run from a PowerShell on the server:  .\deploy.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '== git pull ==' -ForegroundColor Cyan
git pull

Write-Host '== Frontend bauen ==' -ForegroundColor Cyan
npm ci
# Same-origin: the Node server serves the API and the app together.
$env:VITE_API_URL = '/'
$env:VITE_BASE = '/'
npm run build

Write-Host '== Backend bauen ==' -ForegroundColor Cyan
Push-Location server
npm ci
npm run build
Pop-Location

Write-Host '== Neustart (pm2) ==' -ForegroundColor Cyan
# Restart if already running, otherwise start it the first time.
pm2 restart postcards --update-env
if ($LASTEXITCODE -ne 0) {
  pm2 start ecosystem.config.cjs
}
pm2 save

Write-Host 'Fertig - die App laeuft.' -ForegroundColor Green
