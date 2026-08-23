#!/usr/bin/env bash
#
# scripts/cd/smoke.sh
#
# Smoke test post-deploy. Port a bash de probar-integracion.ps1 (raiz del
# repo), adaptado para correr contra el entorno ya desplegado (VM + Caddy
# + HTTPS via sslip.io) en vez de procesos locales.
#
# Uso:
#   scripts/cd/smoke.sh https://1-2-3-4.sslip.io
#   BASE_URL=https://1-2-3-4.sslip.io scripts/cd/smoke.sh
#
# Requiere: curl, grep. Usa python3 (si esta disponible) para parsear JSON;
# si no esta, cae a grep/sed sobre el JSON crudo.
#
# Sale con codigo distinto de 0 ante cualquier fallo.

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-}}"
if [ -z "${BASE_URL}" ]; then
    echo "ERROR: falta la URL base. Uso: smoke.sh <base_url> o BASE_URL=<url> smoke.sh" >&2
    exit 1
fi
# Quita la barra final si viene incluida.
BASE_URL="${BASE_URL%/}"

DEMO_EMAIL="demo@financeai.local"
DEMO_PASSWORD="FinanceAI2026!"

# El primer emitido del certificado de Let's Encrypt (via Caddy/sslip.io)
# puede tardar entre 10 y 30 segundos, ademas del arranque de los
# contenedores. Reintentos generosos al principio.
HEALTH_MAX_INTENTOS=40
HEALTH_ESPERA_SEGUNDOS=3

log() {
    echo "[smoke] $*"
}

fallar() {
    echo "[smoke] ERROR: $*" >&2
    exit 1
}

# Extrae un valor de un JSON plano usando python3 si esta disponible,
# si no cae a un grep/sed best-effort (suficiente para las respuestas
# planas que usa esta API).
json_get() {
    local json="$1"
    local key="$2"
    if command -v python3 >/dev/null 2>&1; then
        python3 -c '
import json, sys
data = json.loads(sys.argv[1])
value = data.get(sys.argv[2], "")
if value is None:
    value = ""
print(value)
' "$json" "$key" 2>/dev/null || true
    else
        echo "$json" | grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
            | head -n1 | sed -E "s/.*:[[:space:]]*\"([^\"]*)\"/\1/"
    fi
}

json_array_length() {
    local json="$1"
    if command -v python3 >/dev/null 2>&1; then
        python3 -c '
import json, sys
data = json.loads(sys.argv[1])
print(len(data) if isinstance(data, list) else 0)
' "$json" 2>/dev/null || echo 0
    else
        echo "$json" | grep -o "{" | wc -l | tr -d ' '
    fi
}

log "Base URL: ${BASE_URL}"

# 1) Esperar /api/health hasta status UP, con reintentos generosos.
log "Esperando /api/health..."
salud_ok="false"
for intento in $(seq 1 "${HEALTH_MAX_INTENTOS}"); do
    respuesta="$(curl -fsS --max-time 5 "${BASE_URL}/api/health" 2>/dev/null || true)"
    if [ -n "${respuesta}" ]; then
        estado="$(json_get "${respuesta}" "status")"
        if [ "${estado}" = "UP" ]; then
            salud_ok="true"
            log "  /api/health respondio UP en el intento ${intento}."
            break
        fi
    fi
    sleep "${HEALTH_ESPERA_SEGUNDOS}"
done
if [ "${salud_ok}" != "true" ]; then
    fallar "/api/health no respondio UP despues de ${HEALTH_MAX_INTENTOS} intentos."
fi

# 2) Login.
log "Autenticando como ${DEMO_EMAIL}..."
login_body="{\"email\":\"${DEMO_EMAIL}\",\"password\":\"${DEMO_PASSWORD}\"}"
login_respuesta="$(curl -fsS --max-time 10 -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "${login_body}")" || fallar "el login fallo (POST /api/auth/login)."

token="$(json_get "${login_respuesta}" "token")"
if [ -z "${token}" ]; then
    fallar "el login no devolvio token. Respuesta: ${login_respuesta}"
fi
log "  Login OK, token obtenido."

# 3) GET /api/transacciones con el Bearer token, al menos 1 resultado.
log "Consultando /api/transacciones..."
transacciones_respuesta="$(curl -fsS --max-time 10 "${BASE_URL}/api/transacciones" \
    -H "Authorization: Bearer ${token}")" || fallar "GET /api/transacciones fallo."

cantidad_transacciones="$(json_array_length "${transacciones_respuesta}")"
if [ -z "${cantidad_transacciones}" ] || [ "${cantidad_transacciones}" -lt 1 ]; then
    fallar "no se encontraron transacciones (se esperaba al menos 1). Respuesta: ${transacciones_respuesta}"
fi
log "  ${cantidad_transacciones} transaccion(es) encontrada(s)."

# 4) POST /api/analisis-financiero y verificar perfil_financiero.
log "Solicitando /api/analisis-financiero..."
analisis_body='{
    "ingreso_mensual": 4500,
    "nivel_endeudamiento": 25,
    "frecuencia_ahorro": "Media",
    "transacciones": [
        {"descripcion": "Supermercado", "valor": 420, "tipo": "gasto"},
        {"descripcion": "Combustible", "valor": 300, "tipo": "gasto"},
        {"descripcion": "Transferencia a ahorro", "valor": 200, "tipo": "ahorro"}
    ]
}'
analisis_respuesta="$(curl -fsS --max-time 20 -X POST "${BASE_URL}/api/analisis-financiero" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "${analisis_body}")" || fallar "POST /api/analisis-financiero fallo."

perfil_financiero="$(json_get "${analisis_respuesta}" "perfil_financiero")"
if [ -z "${perfil_financiero}" ]; then
    fallar "la respuesta de /api/analisis-financiero no trae perfil_financiero. Respuesta: ${analisis_respuesta}"
fi
log "  perfil_financiero = ${perfil_financiero}"

# 5) GET / y verificar que el HTML contiene id="root".
log "Consultando / (frontend)..."
html_respuesta="$(curl -fsS --max-time 10 "${BASE_URL}/")" || fallar "GET / fallo."
if ! echo "${html_respuesta}" | grep -q 'id="root"'; then
    fallar 'el HTML de / no contiene id="root".'
fi
log "  Frontend OK (id=\"root\" presente)."

log "Smoke test OK: health, login, transacciones, analisis-financiero y frontend."
exit 0
