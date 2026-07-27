package com.financeai.dto;

import java.math.BigDecimal;

public record TransaccionClasificadaResponse(

        String descripcion,
        BigDecimal valor,
        String categoria,
        Double confianza

) {
}
