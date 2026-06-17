# Postkarten - einmaliges Setup (Windows)
# Installiert pm2 und legt server\.env mit einem zufaelligen JWT_SECRET an.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '== pm2 global installieren ==' -ForegroundColor Cyan
npm i -g pm2

$envPath = Join-Path $PSScriptRoot 'server\.env'
if (-not (Test-Path $envPath)) {
  Write-Host '== server\.env anlegen (zufaelliges JWT_SECRET) ==' -ForegroundColor Cyan
  $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
  @(
    "JWT_SECRET=$secret",
    'APP_URL=https://postkarten.deinedomain.de',
    'PORT=8787',
    'DB_PATH=./data/postcards.db',
    'ALLOWED_ORIGIN=*'
  ) | Set-Content -Path $envPath -Encoding UTF8
  Write-Host '  -> server\.env erstellt. Bitte APP_URL auf deine Subdomain anpassen!' -ForegroundColor Yellow
} else {
  Write-Host 'server\.env existiert bereits - bleibt unveraendert.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Naechste Schritte:' -ForegroundColor Cyan
Write-Host '  1. server\.env pruefen (APP_URL = deine Subdomain)'
Write-Host '  2. .\deploy.ps1 ausfuehren'
Write-Host '  3. Autostart nach Reboot:  pm2 save  und dann  pm2 startup'
Write-Host '  4. IIS: iis\web.config fuer das Subdomain-Reverse-Proxy nutzen (siehe Kommentare darin)'
