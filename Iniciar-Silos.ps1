$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Instalá Node.js 24 y seguí README.md.' }
if (-not (Test-Path -LiteralPath 'node_modules/express')) { throw 'Faltan dependencias. Ejecutá pnpm install antes de iniciar.' }
if (-not (Test-Path -LiteralPath 'storage/catalog.sqlite')) { & $taskNode --env-file-if-exists=.env scripts/setup.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
Write-Host 'Panel: http://127.0.0.1:5174/admin.html'
Write-Host 'Acceso inicial: storage/ACCESO-LOCAL.txt. Para detener: Ctrl+C.'
& $taskNode --env-file-if-exists=.env server/index.js
