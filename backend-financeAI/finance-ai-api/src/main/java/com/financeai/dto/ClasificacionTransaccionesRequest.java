package com.financeai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record ClasificacionTransaccionesRequest(
        @NotEmpty(message = "Debe incluir al menos una transaccion")
        List<@Valid TransaccionClasificarRequest> transacciones
) {
    public record TransaccionClasificarRequest(
            @NotBlank(message = "La descripcion es obligatoria") String descripcion,
            @NotNull(message = "El valor es obligatorio")
            @DecimalMin(value = "0.01", message = "El valor debe ser mayor que cero") BigDecimal valor
    ) {}
}
