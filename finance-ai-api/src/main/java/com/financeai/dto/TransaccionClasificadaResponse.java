package com.financeai.dto;

import com.financeai.domain.TipoTransaccion;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransaccionClasificadaResponse(

        String descripcion,
        BigDecimal valor,
        LocalDate fecha,
        String moneda,
        TipoTransaccion tipo,
        String categoria

) {
}
