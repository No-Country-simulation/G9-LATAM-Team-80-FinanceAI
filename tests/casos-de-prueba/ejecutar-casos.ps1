<#
Ejecuta los casos de tests/casos-de-prueba/casos_perfil.json contra la API y
compara el resultado con lo esperado.

Requiere el servicio ML en :8000 y el backend en :8080 (usar .\iniciar-local.ps1).

No modifica la tabla transacciones: los movimientos viajan dentro de cada request.
Si escribe una fila en analisis_financieros por cada caso que responda 200,
porque AnalisisFinancieroController guarda el historial siempre.

Ejemplos:
    .\ejecutar-casos.ps1
    .\ejecutar-casos.ps1 -Caso S-01
    .\ejecutar-casos.ps1 -Grupo "En riesgo"
    .\ejecutar-casos.ps1 -Caso U-03 -Detalle
#>
param(
    [string]$ApiUrl = "http://127.0.0.1:8080",
    [string]$Email = "demo@financeai.local",
    [string]$Password = "FinanceAI2026!",
    [string]$Caso = "",
    [string]$Grupo = "",
    [switch]$Detalle
)

$ErrorActionPreference = "Stop"
$archivoCasos = Join-Path $PSScriptRoot "casos_perfil.json"
if (-not (Test-Path $archivoCasos)) { throw "No se encontro $archivoCasos" }

$definicion = Get-Content -Raw -Encoding UTF8 $archivoCasos | ConvertFrom-Json
$casos = $definicion.casos
if ($Caso) { $casos = $casos | Where-Object { $_.id -eq $Caso } }
if ($Grupo) { $casos = $casos | Where-Object { $_.grupo -eq $Grupo } }
if (-not $casos) { throw "Ningun caso coincide con el filtro." }

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/auth/login" -ContentType "application/json" -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.token)" }

$resultados = @()

foreach ($item in $casos) {
    $cuerpo = $item.payload | ConvertTo-Json -Depth 6
    $cabeceras = if ($item.sin_token) { @{} } else { $headers }

    $codigo = 0
    $respuesta = $null
    $errorTexto = ""
    try {
        $r = Invoke-WebRequest -Method Post -Uri "$ApiUrl/api/analisis-financiero" -Headers $cabeceras `
            -ContentType "application/json" -Body $cuerpo -UseBasicParsing
        $codigo = [int]$r.StatusCode
        # Decodificar explicitamente como UTF-8. La API devuelve application/json sin
        # charset (correcto: RFC 8259 define UTF-8 por defecto), pero Windows PowerShell 5.1
        # cae a Latin-1 cuando el charset no viene declarado y convierte "En observación"
        # en "En observaciÃ³n". $r.Content ya viene mal decodificado, hay que ir a los bytes.
        $respuesta = [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp) {
            $codigo = [int]$resp.StatusCode
            $lector = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
            $errorTexto = $lector.ReadToEnd()
        } else {
            $errorTexto = $_.Exception.Message
        }
    }

    $esperado = $item.esperado
    $fallas = @()
    if ($codigo -ne $esperado.http) { $fallas += "http=$codigo (esperado $($esperado.http))" }

    if ($codigo -eq 200 -and $respuesta) {
        if ($esperado.PSObject.Properties.Name -contains "perfil_financiero" -and
            $respuesta.perfil_financiero -ne $esperado.perfil_financiero) {
            $fallas += "perfil='$($respuesta.perfil_financiero)' (esperado '$($esperado.perfil_financiero)')"
        }
        if ($esperado.PSObject.Properties.Name -contains "ratio_gasto_ingreso" -and
            [math]::Abs([double]$respuesta.metricas.ratio_gasto_ingreso - [double]$esperado.ratio_gasto_ingreso) -gt 0.005) {
            $fallas += "ratio=$($respuesta.metricas.ratio_gasto_ingreso) (esperado $($esperado.ratio_gasto_ingreso))"
        }
        if ($esperado.PSObject.Properties.Name -contains "ahorro_estimado_pct" -and
            [math]::Abs([double]$respuesta.metricas.ahorro_estimado_pct - [double]$esperado.ahorro_estimado_pct) -gt 0.005) {
            $fallas += "ahorro_est=$($respuesta.metricas.ahorro_estimado_pct) (esperado $($esperado.ahorro_estimado_pct))"
        }
        if ($esperado.PSObject.Properties.Name -contains "frecuencia_ahorro" -and
            $respuesta.metricas.frecuencia_ahorro -ne $esperado.frecuencia_ahorro) {
            $fallas += "frecuencia='$($respuesta.metricas.frecuencia_ahorro)' (esperado '$($esperado.frecuencia_ahorro)')"
        }
        if ($esperado.PSObject.Properties.Name -contains "n_razones" -and
            @($respuesta.razones).Count -ne $esperado.n_razones) {
            $fallas += "razones=$(@($respuesta.razones).Count) (esperado $($esperado.n_razones))"
        }
        if ($esperado.PSObject.Properties.Name -contains "ahorro_total" -and
            [math]::Abs([double]$respuesta.ahorro_total - [double]$esperado.ahorro_total) -gt 0.01) {
            $fallas += "ahorro_total=$($respuesta.ahorro_total) (esperado $($esperado.ahorro_total))"
        }

        # Invariante global: el modelo tiene que haberse consultado de verdad.
        # Cuando no se consulta, el ML responde probabilidad=1.0, que es indistinguible
        # de "el modelo confia al maximo". Asi se colaba el bug de la tilde: los perfiles
        # 'En observación' reportaban 1.0 sin que nadie hubiera mirado el modelo.
        $esperaModelo = if ($esperado.PSObject.Properties.Name -contains "modelo_consultado") { [bool]$esperado.modelo_consultado } else { $true }
        if ($respuesta.PSObject.Properties.Name -contains "modelo_consultado") {
            if ([bool]$respuesta.modelo_consultado -ne $esperaModelo) {
                $fallas += "modelo_consultado=$($respuesta.modelo_consultado) (esperado $esperaModelo)"
            }
        } else {
            $fallas += "la respuesta no trae modelo_consultado (servicio ML desactualizado)"
        }

        # Cota superior de probabilidad: atrapa el 1.0 del fallback en casos donde el
        # modelo deberia dar una confianza intermedia.
        if ($esperado.PSObject.Properties.Name -contains "probabilidad_max" -and
            [double]$respuesta.probabilidad -gt [double]$esperado.probabilidad_max) {
            $fallas += "probabilidad=$($respuesta.probabilidad) (esperado <= $($esperado.probabilidad_max))"
        }
        if ($esperado.PSObject.Properties.Name -contains "probabilidad_min" -and
            [double]$respuesta.probabilidad -lt [double]$esperado.probabilidad_min) {
            $fallas += "probabilidad=$($respuesta.probabilidad) (esperado >= $($esperado.probabilidad_min))"
        }
    }

    $estado = if ($fallas.Count -eq 0) { "OK" } else { "DIFIERE" }
    $color = if ($fallas.Count -eq 0) { "Green" } else { "Yellow" }

    Write-Host ("{0,-6} {1,-9} {2}" -f $item.id, $estado, $item.titulo) -ForegroundColor $color
    if ($fallas.Count -gt 0) {
        foreach ($falla in $fallas) { Write-Host "         -> $falla" -ForegroundColor Yellow }
        if ($errorTexto) { Write-Host "         -> cuerpo: $errorTexto" -ForegroundColor DarkGray }
    }
    if ($Detalle -and $respuesta) {
        Write-Host ($respuesta | ConvertTo-Json -Depth 6) -ForegroundColor DarkGray
    }

    $resultados += [pscustomobject]@{
        Id = $item.id; Grupo = $item.grupo; Estado = $estado
        Perfil = if ($respuesta) { $respuesta.perfil_financiero } else { "" }
        Ratio = if ($respuesta) { $respuesta.metricas.ratio_gasto_ingreso } else { $null }
        Diferencias = ($fallas -join "; ")
    }
}

$ok = @($resultados | Where-Object { $_.Estado -eq "OK" }).Count
$total = $resultados.Count
Write-Host ""
Write-Host "$ok de $total casos coinciden con lo esperado." -ForegroundColor Cyan
if ($ok -lt $total) {
    Write-Host "Los que difieren estan documentados en README.md seccion 2 (causas C1-C6)." -ForegroundColor Cyan
}
$resultados | Format-Table -AutoSize
