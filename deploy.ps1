# Wanderpost - Deploy (Windows / pm2)
# Pulls the latest code, builds the frontend + backend and (re)starts the
# pm2 process. Run from a PowerShell on the server:  .\deploy.ps1
#
# No build tools (Visual Studio / node-gyp) are required: the backend uses a
# pure-WASM SQLite, so `npm ci` only downloads JavaScript.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# PowerShell does NOT stop on a failing native command (npm/git) by default,
# so we check the exit code after each step explicitly.
function Assert-Ok($what) {
  if ($LASTEXITCODE -ne 0) { throw "$what fehlgeschlagen (Exit $LASTEXITCODE)." }
}

Write-Host '== git pull ==' -ForegroundColor Cyan
git pull
Assert-Ok 'git pull'

Write-Host '== Frontend bauen ==' -ForegroundColor Cyan
npm ci
Assert-Ok 'npm ci (Frontend)'
# Same-origin: the Node server serves the API and the app together.
$env:VITE_API_URL = '/'
$env:VITE_BASE = '/'
npm run build
Assert-Ok 'Frontend-Build'

Write-Host '== Backend bauen (reines JS/WASM, keine Build-Tools noetig) ==' -ForegroundColor Cyan
Push-Location server
try {
  npm ci
  Assert-Ok 'npm ci (Backend)'
  npm run build
  Assert-Ok 'Backend-Build'
} finally {
  Pop-Location
}

Write-Host '== Neustart (pm2) ==' -ForegroundColor Cyan
# Restart if already running, otherwise start it the first time.
pm2 restart wanderpost --update-env
if ($LASTEXITCODE -ne 0) {
  pm2 start ecosystem.config.cjs
  Assert-Ok 'pm2 start'
}
pm2 save

Write-Host 'Fertig - die App laeuft.' -ForegroundColor Green
