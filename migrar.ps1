$ErrorActionPreference = "Stop"
$fly = "$env:USERPROFILE\fly\flyctl.exe"
$key = "gM3f9xK7vQ2pL8nR4wE6"
$railway = "https://web-production-83b4ae.up.railway.app"
$flyApp = "https://sistema-chamados-granmarquise.fly.dev"
$dbLocal = "$env:TEMP\chamados_railway.db"
$uplLocal = "$env:TEMP\uploads_railway.tar.gz"

Write-Host "=== MIGRACAO Railway -> Fly.io ==="

Write-Host "[1/4] Baixando banco de dados do Railway..."
$dbUrl = $railway + "/api/export/db?key=" + $key
Invoke-WebRequest -Uri $dbUrl -OutFile $dbLocal -UseBasicParsing -TimeoutSec 120
$dbSize = [math]::Round((Get-Item $dbLocal).Length / 1MB, 2)
Write-Host "OK - $dbSize MB"

Write-Host "[2/4] Baixando uploads do Railway..."
$uplUrl = $railway + "/api/export/uploads?key=" + $key
$temUploads = $false
try {
    Invoke-WebRequest -Uri $uplUrl -OutFile $uplLocal -UseBasicParsing -TimeoutSec 300
    $uplSize = [math]::Round((Get-Item $uplLocal).Length / 1MB, 2)
    if ($uplSize -gt 0) {
        Write-Host "OK - $uplSize MB"
        $temUploads = $true
    } else {
        Write-Host "Sem uploads"
    }
} catch {
    Write-Host "Sem uploads (pasta vazia)"
}

Write-Host "[3/4] Importando banco no Fly.io..."
$importDbUrl = $flyApp + "/api/export/import-db?key=" + $key
$r = Invoke-RestMethod -Uri $importDbUrl -Method POST -InFile $dbLocal -ContentType "application/octet-stream" -TimeoutSec 120
Write-Host "OK - $($r.bytes) bytes importados"

Write-Host "Aguardando app reiniciar..."
Start-Sleep -Seconds 10

if ($temUploads) {
    Write-Host "[4/4] Importando uploads no Fly.io..."
    $importUplUrl = $flyApp + "/api/export/import-uploads?key=" + $key
    $r2 = Invoke-RestMethod -Uri $importUplUrl -Method POST -InFile $uplLocal -ContentType "application/octet-stream" -TimeoutSec 600
    Write-Host "OK - $($r2.bytes) bytes importados"
} else {
    Write-Host "[4/4] Sem uploads para importar"
}

Remove-Item $dbLocal -ErrorAction SilentlyContinue
Remove-Item $uplLocal -ErrorAction SilentlyContinue

Write-Host "=== MIGRACAO CONCLUIDA! ==="
Write-Host "Acesse: https://sistema-chamados-granmarquise.fly.dev"
