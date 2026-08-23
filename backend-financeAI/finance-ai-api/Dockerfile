# syntax=docker/dockerfile:1

# ---- Etapa build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Cache de capas: descarga dependencias antes de copiar el codigo fuente.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests -Dspring-boot.excludeDevtools=true \
    && cp target/finance-ai-api-*.jar app.jar

# ---- Etapa runtime ----
FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

RUN groupadd -r spring && useradd -r -g spring spring

COPY --from=build /build/app.jar app.jar

USER spring
EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-jar", "app.jar"]
