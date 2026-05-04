# Instala os git hooks do projeto (rodar uma vez apos clonar)
# Uso: powershell -ExecutionPolicy Bypass -File scripts\install-hooks.ps1

$hooksDir = Join-Path $PSScriptRoot "..\\.git\\hooks"
$hooksDir = [System.IO.Path]::GetFullPath($hooksDir)

$railwayToken  = "0395193f-6965-484f-bc2c-d13e5c78888a"
$projectId     = "46c9a99e-7824-4c7f-8c15-886f825a461e"
$environmentId = "5a1be2d0-373d-4a3f-8c3b-e27f169b596b"
$serviceId     = "2acb4524-0b02-4dc9-918c-d6f0b5ebbae2"

$gqlMutation = '{"query":"mutation { environmentTriggersDeploy(input: { projectId:\"' + $projectId + '\", environmentId:\"' + $environmentId + '\", serviceId:\"' + $serviceId + '\" }) }"}'

# railway-deploy.ps1 helper
$deployScript = @"
Start-Sleep -Seconds 20
`$headers = @{ "Authorization" = "Bearer $railwayToken"; "Content-Type" = "application/json" }
`$body = '$gqlMutation'
try {
  `$r = Invoke-RestMethod -Uri "https://backboard.railway.app/graphql/v2" -Method POST -Headers `$headers -Body `$body -UseBasicParsing
  Add-Content -Path "`$env:TEMP\railway-deploy.log" -Value "`$(Get-Date -f 'yyyy-MM-dd HH:mm:ss') OK"
} catch {
  Add-Content -Path "`$env:TEMP\railway-deploy.log" -Value "`$(Get-Date -f 'yyyy-MM-dd HH:mm:ss') ERR: `$_"
}
"@

$deployScriptPath = Join-Path $hooksDir "railway-deploy.ps1"
[System.IO.File]::WriteAllText($deployScriptPath, $deployScript, [System.Text.Encoding]::ASCII)

# pre-push hook (bash, LF endings)
$deployScriptUnix = $deployScriptPath.Replace("\", "/")
$hookLines = @(
  "#!/bin/sh",
  "(sleep 20 && curl -s -X POST 'https://backboard.railway.app/graphql/v2' \",
  "  -H 'Authorization: Bearer $railwayToken' \",
  "  -H 'Content-Type: application/json' \",
  "  -d '$gqlMutation') &",
  "exit 0"
)
$hookContent = $hookLines -join "`n"
[System.IO.File]::WriteAllText((Join-Path $hooksDir "pre-push"), $hookContent, [System.Text.Encoding]::ASCII)

Write-Host "Hooks instalados em: $hooksDir"
Write-Host "  - pre-push (auto-deploy Railway)"
