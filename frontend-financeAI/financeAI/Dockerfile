FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

# El widget se configura en tiempo de ejecucion (ver docker/30-oven-config.sh); aqui solo
# se fija la URL de la API por si alguien quiere apuntar a un backend externo al construir.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Evita que envsubst toque las variables internas de nginx ($host, $uri, $scheme, ...).
ENV NGINX_ENVSUBST_FILTER="^(OVEN_|API_)"

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/15-oven-defaults.envsh /docker-entrypoint.d/15-oven-defaults.envsh
COPY docker/30-oven-config.sh /docker-entrypoint.d/30-oven-config.sh
RUN chmod +x /docker-entrypoint.d/15-oven-defaults.envsh /docker-entrypoint.d/30-oven-config.sh

EXPOSE 80
