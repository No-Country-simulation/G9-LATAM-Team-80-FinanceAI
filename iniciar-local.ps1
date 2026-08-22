$ErrorActionPreference = "Stop"
$raizProyecto = $PSScriptRoot
$mlDir = Join-Path $raizProyecto "feature-financeAI\ml-service"
$backendDir = Join-Path $raizProyecto "backend-financeAI\finance-ai-api"
$frontendDir = Join-Path $raizProyecto "frontend-financeAI\financeAI"
$pythonVenv = Join-Path $mlDir ".venv\Scripts\python.exe"
$backendJar = Join-Path $backendDir "target\finance-ai-api-0.0.1-SNAPSHOT.jar"
$viteEntry = Join-Path $frontendDir "node_modules\vite\bin\vite.js"

if (-not (Test-Path $pythonVenv)) {
    throw "Falta el entorno Python. Ejecuta primero .\preparar-local.ps1"
}
$javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
if (-not $javaCommand) {
    $jdkLocal = Get-ChildItem -Path "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($jdkLocal) {
        $env:JAVA_HOME = $jdkLocal.FullName
        $javaCommand = Get-Command (Join-Path $jdkLocal.FullName "bin\java.exe")
    }
}
if (-not $javaCommand) {
    throw "Falta Java. FinanceAI requiere un JDK 17 para iniciar el backend."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Falta npm en PATH. Instala Node.js 20 o superior."
}
if (-not (Test-Path $backendJar)) {
    throw "Falta el backend empaquetado. Ejecuta primero .\preparar-local.ps1"
}
if (-not (Test-Path $viteEntry)) {
    throw "Faltan las dependencias del frontend. Ejecuta primero .\preparar-local.ps1"
}

$procesos = @()
try {
    # Evita el conflicto Path/PATH que algunos terminales de Windows heredan.
    $rutaProceso = $env:Path
    [Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    [Environment]::SetEnvironmentVariable("Path", $null, "Process")
    [Environment]::SetEnvironmentVariable("Path", $rutaProceso, "Process")

    $procesos += Start-Process -FilePath $pythonVenv -ArgumentList @("-m", "uvicorn", "app:app", "--port", "8000") -WorkingDirectory $mlDir -NoNewWindow -PassThru
    $procesos += Start-Process -FilePath $javaCommand.Source -ArgumentList @("-jar", $backendJar) -WorkingDirectory $backendDir -NoNewWindow -PassThru
    $procesos += Start-Process -FilePath "node" -ArgumentList @($viteEntry, "--host", "0.0.0.0") -WorkingDirectory $frontendDir -NoNewWindow -PassThru

    $apiLista = $false
    for ($intento = 1; $intento -le 30 -and -not $apiLista; $intento++) {
        Start-Sleep -Seconds 1
        try {
            $salud = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/health" -TimeoutSec 2
            $apiLista = $salud.status -eq "UP"
        } catch { $apiLista = $false }
    }
    if (-not $apiLista) { throw "La API Java no estuvo lista despues de 30 segundos." }

    Write-Host "FinanceAI esta iniciando:" -ForegroundColor Cyan
    Write-Host "  Aplicacion:  http://localhost:5174"
    Write-Host "  API Java:    http://localhost:8080/api/health"
    Write-Host "  API ML:      http://localhost:8000/docs"
    Write-Host "Presiona Ctrl+C para detener todos los servicios."

    while ($true) {
        Start-Sleep -Seconds 2
        foreach ($proceso in $procesos) {
            if ($proceso.HasExited) {
                throw "Uno de los servicios se detuvo. Revisa el error mostrado arriba."
            }
        }
    }
}
finally {
    foreach ($proceso in $procesos) {
        if (-not $proceso.HasExited) { Stop-Process -Id $proceso.Id -Force }
    }
}
