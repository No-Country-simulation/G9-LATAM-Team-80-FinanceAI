$ErrorActionPreference = "Stop"
$raizProyecto = $PSScriptRoot
$mlDir = Join-Path $raizProyecto "feature-financeAI\ml-service"
$backendDir = Join-Path $raizProyecto "backend-financeAI\finance-ai-api"
$frontendDir = Join-Path $raizProyecto "frontend-financeAI\financeAI"
$pythonVenv = Join-Path $mlDir ".venv\Scripts\python.exe"
$backendJar = Join-Path $backendDir "target\finance-ai-api-0.0.1-SNAPSHOT.jar"
$viteEntry = Join-Path $frontendDir "node_modules\vite\bin\vite.js"

$javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
if (-not $javaCommand) {
    $jdkLocal = Get-ChildItem -Path "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($jdkLocal) { $javaCommand = Get-Command (Join-Path $jdkLocal.FullName "bin\java.exe") }
}
if (-not $javaCommand -or -not (Test-Path $pythonVenv) -or -not (Test-Path $backendJar) -or -not (Test-Path $viteEntry)) {
    throw "Faltan componentes preparados. Ejecuta primero .\preparar-local.ps1"
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
    if (-not $apiLista) { throw "La API no estuvo lista despues de 30 segundos." }

    $frontend = Invoke-WebRequest -Uri "http://127.0.0.1:5174" -UseBasicParsing -TimeoutSec 5
    if ($frontend.StatusCode -ne 200 -or $frontend.Content -notmatch "root") {
        throw "El frontend no respondio correctamente en el puerto 5174."
    }

    $loginBody = @{ email = "demo@financeai.local"; password = "FinanceAI2026!" } | ConvertTo-Json
    $login = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/auth/login" -ContentType "application/json" -Body $loginBody
    $headers = @{ Authorization = "Bearer $($login.token)" }

    $transacciones = @(Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/transacciones" -Headers $headers)
    if ($transacciones.Count -lt 1) { throw "No se encontraron las transacciones iniciales." }

    $nuevaBody = @{
        descripcion = "Prueba automatica temporal"
        categoria = "otros"
        tipo = "gasto"
        fecha = (Get-Date -Format "yyyy-MM-dd")
        monto = 1
    } | ConvertTo-Json
    $nueva = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/transacciones" -Headers $headers -ContentType "application/json" -Body $nuevaBody
    Invoke-RestMethod -Method Delete -Uri "http://127.0.0.1:8080/api/transacciones/$($nueva.id)" -Headers $headers | Out-Null

    $presupuestoBody = @{ categoria = "alimentacion"; presupuesto = 800 } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:8080/api/presupuestos" -Headers $headers -ContentType "application/json" -Body $presupuestoBody | Out-Null

    $clasificacionBody = @{
        transacciones = @(
            @{ descripcion = "Supermercado"; valor = 420 },
            @{ descripcion = "Combustible"; valor = 300 },
            @{ descripcion = "Streaming"; valor = 40 }
        )
    } | ConvertTo-Json -Depth 4
    $clasificacion = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/clasificar-transacciones" -Headers $headers -ContentType "application/json" -Body $clasificacionBody
    if (@($clasificacion.clasificaciones).Count -ne 3) { throw "El clasificador no devolvio las tres transacciones." }

    $analisisBody = @{
        ingreso_mensual = 4500
        nivel_endeudamiento = 25
        frecuencia_ahorro = "Media"
        transacciones = @(
            @{ descripcion = "Supermercado"; valor = 420; tipo = "gasto" },
            @{ descripcion = "Combustible"; valor = 300; tipo = "gasto" },
            @{ descripcion = "Transferencia a ahorro"; valor = 200; tipo = "ahorro" }
        )
    } | ConvertTo-Json -Depth 5
    $analisis = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/analisis-financiero" -Headers $headers -ContentType "application/json" -Body $analisisBody
    if (-not $analisis.perfil_financiero) { throw "El servicio ML no devolvio el perfil financiero." }

    $historial = @(Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/historial" -Headers $headers)
    if ($historial.Count -lt 1) { throw "El analisis no se guardo en el historial." }

    Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/auth/logout" -Headers $headers | Out-Null
    Write-Host "Integracion OK: React, login, MySQL, transacciones, presupuestos, clasificacion, analisis ML e historial." -ForegroundColor Green
}
finally {
    foreach ($proceso in $procesos) {
        if (-not $proceso.HasExited) { Stop-Process -Id $proceso.Id -Force }
    }
}
