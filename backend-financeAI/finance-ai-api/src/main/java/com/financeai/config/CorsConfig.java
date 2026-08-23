package com.financeai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] frontendOrigins;

    /**
     * Acepta una lista separada por comas para poder servir el mismo contenedor en local,
     * en el dominio de despliegue y detras del proxy de nginx sin recompilar.
     */
    public CorsConfig(@Value("${financeai.cors.allowed-origin}") String frontendOrigin) {
        this.frontendOrigins = Arrays.stream(frontendOrigin.split(","))
                .map(String::trim)
                .filter(origen -> !origen.isEmpty())
                .toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                // allowedOriginPatterns admite comodines (https://*.vercel.app) ademas de origenes exactos.
                .allowedOriginPatterns(frontendOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
