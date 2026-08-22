package com.financeai.exception;

import com.financeai.dto.ErrorValidacionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorValidacionResponse> manejarErroresDeValidacion(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> errores = new LinkedHashMap<>();

        exception.getBindingResult()
                .getFieldErrors()
                .forEach(error -> errores.put(
                        error.getField(),
                        error.getDefaultMessage()
                ));

        ErrorValidacionResponse response = new ErrorValidacionResponse(
                LocalDateTime.now(),
                400,
                "Los datos enviados no son válidos",
                errores
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorValidacionResponse> manejarSolicitudNoLegible(
            HttpMessageNotReadableException exception
    ) {
        ErrorValidacionResponse response = new ErrorValidacionResponse(
                LocalDateTime.now(),
                400,
                "El cuerpo de la solicitud no es válido",
                Map.of(
                        "solicitud",
                        "Verifique el formato JSON y los valores enviados"
                )
        );

        return ResponseEntity.badRequest().body(response);
    }
}

