package com.financeai.domain;

import java.math.BigDecimal;
import java.time.YearMonth;

public record ResumenFinanciero(

        YearMonth periodo,
        BigDecimal ingresoMensual,
        BigDecimal gastoTotalMes,
        BigDecimal ratioGastoIngreso,
        String moneda

) {
}
