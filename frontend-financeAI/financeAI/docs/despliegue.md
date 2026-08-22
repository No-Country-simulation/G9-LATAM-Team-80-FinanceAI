# Despliegue

Opciones compatibles con el requisito OCI:

- OCI Compute para servir frontend y backend.
- OCI Object Storage para almacenar modelos o archivos CSV.
- OCI Functions para procesamiento especifico.

El `Dockerfile` genera una imagen estatica con Nginx para servir `dist`.
