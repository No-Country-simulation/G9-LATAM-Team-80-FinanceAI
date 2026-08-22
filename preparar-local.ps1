$ErrorActionPreference = "Stop"
$raizProyecto = $PSScriptRoot
$mlDir = Join-Path $raizProyecto "feature-financeAI\ml-service"
$frontendDir = Join-Path $raizProyecto "frontend-financeAI\financeAI"
$backendDir = Join-Path $raizProyecto "backend-financeAI\finance-ai-api"
$schemaSql = Join-Path $raizProyecto "database\001_schema.sql"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python 3 no esta instalado o no esta disponible en PATH."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js y npm no estan instalados o no estan disponibles en PATH."
}
$javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
if (-not $javaCommand) {
    $jdkLocal = Get-ChildItem -Path "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($jdkLocal) {
        $env:JAVA_HOME = $jdkLocal.FullName
        $env:Path = "$(Join-Path $jdkLocal.FullName 'bin');$env:Path"
        $javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
    }
}
if (-not $javaCommand) {
    throw "Falta Java. Instala un JDK 17 y vuelve a abrir la terminal antes de continuar."
}
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = Split-Path (Split-Path $javaCommand.Source -Parent) -Parent
}

$mysqlCommand = Get-Command mysql.exe -ErrorAction SilentlyContinue
$mysqlExe = if ($mysqlCommand) { $mysqlCommand.Source } else { "C:\xampp\mysql\bin\mysql.exe" }
if (-not (Test-Path $mysqlExe)) {
    throw "Falta el cliente de MySQL. Instala MySQL 8 o inicia MySQL/MariaDB desde XAMPP."
}

$mysqlRootArgs = @("-u", "root")
if ($env:MYSQL_ROOT_PASSWORD) {
    $mysqlRootArgs += "--password=$($env:MYSQL_ROOT_PASSWORD)"
}
Write-Host "Creando o verificando la base financeai..." -ForegroundColor Cyan
Get-Content -Raw $schemaSql | & $mysqlExe @mysqlRootArgs
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear la base financeai. Verifica que MySQL este iniciado y que MYSQL_ROOT_PASSWORD sea correcto."
}
& $mysqlExe -h 127.0.0.1 -u financeai_app "--password=FinanceAI_local_2026!" -e "SELECT 1" financeai | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "El esquema existe, pero no se pudo validar el usuario financeai_app."
}

$pythonVenv = Join-Path $mlDir ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonVenv)) {
    Push-Location $mlDir
    try { python -m venv .venv } finally { Pop-Location }
}

& $pythonVenv -m pip install -r (Join-Path $mlDir "requirements.txt")
Push-Location $frontendDir
try { npm.cmd install } finally { Pop-Location }
Push-Location $backendDir
try { .\mvnw.cmd clean package -DskipTests } finally { Pop-Location }

Write-Host "Base de datos y dependencias listas. Ejecuta: .\iniciar-local.ps1" -ForegroundColor Green
