<#
Carga uno de los CSV de datos/ en la base, via la API.

Por defecto se NIEGA a cargar si el usuario ya tiene transacciones, porque sumar
dos datasets es justamente lo que produjo la mezcla de escalas original (causa C6).
Usa -Reemplazar para borrar lo que haya antes de cargar.

Ejemplos:
    .\cargar-csv.ps1 -Archivo datos\perfil-saludable.csv
    .\cargar-csv.ps1 -Archivo datos\perfil-observacion.csv -Reemplazar
    .\cargar-csv.ps1 -Archivo ..\..\demo\transacciones_demo_financeai.csv -Reemplazar
#>
param(
    [Parameter(Mandatory = $true)][string]$Archivo,
    [string]$ApiUrl = "http://127.0.0.1:8080",
    [string]$Email = "demo@financeai.local",
    [string]$Password = "FinanceAI2026!",
    [switch]$Reemplazar
)

$ErrorActionPreference = "Stop"

$ruta = if ([System.IO.Path]::IsPathRooted($Archivo)) { $Archivo } else { Join-Path $PSScriptRoot $Archivo }
if (-not (Test-Path $ruta)) { throw "No se encontro el archivo: $ruta" }

$login = Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/auth/login" -ContentType "application/json" `
    -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.token)" }

# Ojo: hay que ASIGNAR la respuesta antes de contarla. Si se pipea directo
# (Invoke-RestMethod ... | Where-Object ...), PowerShell 5.1 manda el array JSON al
# pipeline sin desenrollarlo, asi que un [] vacio llega como UN elemento y el guardia
# se dispara con la base vacia. Al asignarlo primero, @() lo desenrolla bien.
$respuestaTransacciones = Invoke-RestMethod -Uri "$ApiUrl/api/transacciones" -Headers $headers
$existentes = @($respuestaTransacciones)
if ($existentes.Count -gt 0) {
    if (-not $Reemplazar) {
        throw "El usuario ya tiene $($existentes.Count) transacciones. Cargar encima las sumaria y volverias a mezclar datasets. Usa -Reemplazar si quieres borrarlas primero."
    }
    Write-Host "Borrando $($existentes.Count) transacciones previas..." -ForegroundColor Yellow
    foreach ($t in $existentes) {
        Invoke-RestMethod -Method Delete -Uri "$ApiUrl/api/transacciones/$($t.id)" -Headers $headers | Out-Null
    }
}

$hoy = Get-Date
$filas = Import-Csv -Path $ruta -Encoding UTF8
$movimientos = @()
$descartadas = @()
foreach ($fila in $filas) {
    # El endpoint valida @PastOrPresent: una fecha futura hace fallar el lote entero.
    if ([datetime]::Parse($fila.fecha) -gt $hoy) {
        $descartadas += "$($fila.fecha)  $($fila.descripcion)"
        continue
    }
    # pscustomobject y no hashtable: ConvertTo-Json los serializa igual, pero
    # Group-Object y Measure-Object -Property solo leen propiedades de objetos,
    # no claves de hashtable (en PowerShell 5.1 fallan en silencio o con error).
    $movimientos += [pscustomobject]@{
        descripcion = $fila.descripcion
        categoria   = $fila.categoria
        tipo        = $fila.tipo
        fecha       = $fila.fecha
        monto       = [decimal]$fila.monto
    }
}

if ($descartadas.Count -gt 0) {
    Write-Host "Descartadas $($descartadas.Count) filas con fecha futura (el API las rechaza):" -ForegroundColor Yellow
    $descartadas | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
}
if ($movimientos.Count -eq 0) { throw "No quedo ninguna fila cargable." }

$creadas = Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/transacciones/importar" -Headers $headers `
    -ContentType "application/json" -Body (@{ transacciones = $movimientos } | ConvertTo-Json -Depth 5)

# La app analiza UN mes: el mas reciente con movimientos. El resumen tiene que hablar
# del mismo periodo, o sugiere un "ingreso mensual" que es la suma de varios meses.
$mesAnalizado = ($movimientos | ForEach-Object { $_.fecha.Substring(0, 7) } | Sort-Object -Descending | Select-Object -First 1)
$delMes = @($movimientos | Where-Object { $_.fecha.StartsWith($mesAnalizado) })

$porTipo = $delMes | Group-Object tipo | ForEach-Object {
    $suma = ($_.Group | Measure-Object -Property monto -Sum).Sum
    "{0}={1:N0}" -f $_.Name, $suma
}
$deudas = ($delMes | Where-Object { $_.categoria -eq "deudas" } | Measure-Object -Property monto -Sum).Sum
$ingreso = ($delMes | Where-Object { $_.tipo -eq "ingreso" } | Measure-Object -Property monto -Sum).Sum

Write-Host ""
Write-Host "Cargadas $(@($creadas).Count) transacciones desde $(Split-Path -Leaf $ruta)" -ForegroundColor Green
if (@($movimientos).Count -ne $delMes.Count) {
    Write-Host "  El archivo tiene varios meses. La app analiza el mas reciente: $mesAnalizado ($($delMes.Count) de $(@($movimientos).Count) movimientos)." -ForegroundColor Yellow
}
Write-Host "  mes $mesAnalizado -> $($porTipo -join '  ')"
if ($deudas -gt 0 -and $ingreso -gt 0) {
    Write-Host ("  categoria deudas = {0:N0}  ->  usa nivel_endeudamiento = {1:N1}% en la pantalla de Analisis" -f $deudas, ($deudas / $ingreso * 100)) -ForegroundColor Cyan
}
if ($ingreso -gt 0) {
    Write-Host ("  usa ingreso mensual = {0:N0}" -f $ingreso) -ForegroundColor Cyan
}
