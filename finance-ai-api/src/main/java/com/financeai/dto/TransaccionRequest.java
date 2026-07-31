package com.financeai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransaccionRequest(

        @NotBlank(message = "La descripción es obligatoria")
        String descripcion,

        @NotNull(message = "El valor es obligatorio")
        @DecimalMin(
                value = "0.01",
                message = "El valor debe ser mayor que cero"
        )
        BigDecimal valor,

        @NotNull(message = "La fecha es obligatoria")
        @PastOrPresent(message = "La fecha no puede ser futura")
        LocalDate fecha

) {
}
