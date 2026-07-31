package com.financeai.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransaccionClasificadaResponse(

        String descripcion,
        BigDecimal valor,
        LocalDate fecha,
        String moneda,
        String categoria

) {
}
