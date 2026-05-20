$ErrorActionPreference = "Stop"
$fly = "$env:USERPROFILE\fly\flyctl.exe"
$key = "gM3f9xK7vQ2pL8nR4wE6"
$railway = "https://web-production-83b4ae.up.railway.app"
$flyApp = "https://sistema-chamados-granmarquise.fly.dev"
$dbLocal = "$env:TEMP\chamados_railway.db"
$uplLocal = "$env:TEMP\uploads_railway.tar.gz"

Write-Host "`n=== MIGRACAO Railway -> Fly.io ===" -ForegroundColor Cyan

# 1. Baixar banco de dados do Railway
Write-Host "`n[1/4] Baixando banco de dados do Railway..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "$railway/api/export/db?key=$key" -OutFile $dbLocal -UseBasicParsing -TimeoutSec 120
$dbSize = [math]::Round((Get-Item $dbLocal).Length / 1MB, 2)
Write-Host "      OK — $dbSize MB baixados" -ForegroundColor Green

# 2. Baixar uploads do Railway
Write-Host "`n[2/4] Baixando uploads do Railway..." -ForegroundColor Yellow
try {
  $resp = Invoke-WebRequest -Uri "$railway/api/export/uploads?key=$key" -OutFile $uplLocal -UseBasicParsing -TimeoutSec 300
  $uplSize = [math]::Round((Get-Item $uplLocal).Length / 1MB, 2)
  Write-Host "      OK — $uplSize MB baixados" -ForegroundColor Green
  $temUploads = $true
} catch {
  if ($_.Exception.Response.StatusCode -eq 204) {
    Write-Host "      Nenhum upload encontrado (pasta vazia)" -ForegroundColor Gray
    $temUploads = $false
  } else {
    throw $_
  }
}

# 3. Importar banco no Fly.io
Write-Host "`n[3/4] Importando banco no Fly.io..." -ForegroundColor Yellow
$r = Invoke-RestMethod -Uri "$flyApp/api/export/import-db?key=$key" `
  -Method POST `
  -InFile $dbLocal `
  -ContentType "application/octet-stream" `
  -TimeoutSec 120
Write-Host "      OK — $($r.bytes) bytes importados" -ForegroundColor Green

# Aguarda o app reiniciar
Write-Host "      Aguardando app reiniciar..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# 4. Importar uploads no Fly.io
if ($temUploads) {
  Write-Host "`n[4/4] Importando uploads no Fly.io..." -ForegroundColor Yellow
  $r2 = Invoke-RestMethod -Uri "$flyApp/api/export/import-uploads?key=$key" `
    -Method POST `
    -InFile $uplLocal `
    -ContentType "application/octet-stream" `
    -TimeoutSec 600
  Write-Host "      OK — $($r2.bytes) bytes importados" -ForegroundColor Green
} else {
  Write-Host "`n[4/4] Nenhum upload para importar — pulando" -ForegroundColor Gray
}

# Limpeza
Remove-Item $dbLocal -ErrorAction SilentlyContinue
Remove-Item $uplLocal -ErrorAction SilentlyContinue

Write-Host "`n=== MIGRACAO CONCLUIDA! ===" -ForegroundColor Green
Write-Host "Acesse: https://sistema-chamados-granmarquise.fly.dev" -ForegroundColor Cyan
