package com.financeai.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException exception) {
        Map<String, String> campos = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> campos.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(error("Los datos enviados no son validos", campos));
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<Map<String, Object>> servicioMlNoDisponible(RestClientException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(error("El servicio de analisis no esta disponible", Map.of()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> estado(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(error(exception.getReason() == null ? "La solicitud no pudo completarse" : exception.getReason(), Map.of()));
    }

    private Map<String, Object> error(String mensaje, Map<String, String> campos) {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("timestamp", Instant.now());
        respuesta.put("mensaje", mensaje);
        respuesta.put("errores", campos);
        return respuesta;
    }
}
