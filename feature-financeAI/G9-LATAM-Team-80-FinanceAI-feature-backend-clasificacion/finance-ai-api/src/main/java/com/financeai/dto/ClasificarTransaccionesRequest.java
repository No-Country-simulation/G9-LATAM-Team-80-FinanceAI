package com.financeai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ClasificarTransaccionesRequest(

        @NotEmpty(message = "Debe incluir al menos una transacción")
        List<@Valid TransaccionRequest> transacciones

) {
}
