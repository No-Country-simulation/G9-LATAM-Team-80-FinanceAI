#!/bin/sh
# Genera /oven-config.js con la configuracion del widget leida del entorno.
# Se ejecuta en cada arranque del contenedor, de modo que cambiar la API, el tenant
# o el agente no obliga a reconstruir la imagen del frontend.
set -eu

destino="/usr/share/nginx/html/oven-config.js"

cat > "$destino" <<EOF
// Generado automaticamente por docker/30-oven-config.sh. No editar a mano.
window.__OVEN_CONFIG__ = {
  habilitado: "${OVEN_HABILITADO}",
  src: "${OVEN_WIDGET_SRC}",
  apiUrl: "${OVEN_API_URL}",
  embedKey: "${OVEN_EMBED_KEY}",
  tenant: "${OVEN_TENANT}",
  agent: "${OVEN_AGENT}",
  theme: "${OVEN_THEME}",
  visualStyle: "${OVEN_VISUAL_STYLE}",
  position: "${OVEN_POSITION}",
  textoEntrada: "${OVEN_TEXTO_ENTRADA}",
  ocultarAccionesRapidas: "${OVEN_OCULTAR_ACCIONES}",
  preguntasIniciales: "${OVEN_PREGUNTAS_INICIALES}"
};
EOF

echo "[oven] configuracion del widget generada -> api=${OVEN_API_URL} tenant=${OVEN_TENANT} agent=${OVEN_AGENT}"
