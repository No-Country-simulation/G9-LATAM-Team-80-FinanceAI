package com.financeai.service;

import com.financeai.domain.TipoTransaccion;
import com.financeai.domain.ResumenFinanciero;
import com.financeai.dto.TransaccionRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;

@Service
public class CalculoFinancieroService {

    private static final int ESCALA_RATIO = 4;
    private static final String MONEDA = "USD";

    public BigDecimal calcularGastoTotalMes(
            List<TransaccionRequest> transacciones,
            YearMonth periodo
    ) {
        Objects.requireNonNull(
                transacciones,
                "La lista de transacciones es obligatoria"
        );

        Objects.requireNonNull(
                periodo,
                "El periodo es obligatorio"
        );

        return transacciones.stream()
                .filter(Objects::nonNull)
                .filter(transaccion ->
                        TipoTransaccion.GASTO == transaccion.tipo()
                )
                .filter(transaccion ->
                        transaccion.fecha() != null
                )
                .filter(transaccion ->
                        YearMonth.from(transaccion.fecha())
                                .equals(periodo)
                )
                .map(TransaccionRequest::valor)
                .filter(Objects::nonNull)
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                );
    }

    public BigDecimal calcularRatioGastoIngreso(
            BigDecimal gastoTotalMes,
            BigDecimal ingresoMensual
    ) {
        Objects.requireNonNull(
                gastoTotalMes,
                "El gasto total del mes es obligatorio"
        );

        Objects.requireNonNull(
                ingresoMensual,
                "El ingreso mensual es obligatorio"
        );

        if (gastoTotalMes.signum() < 0) {
            throw new IllegalArgumentException(
                    "El gasto total del mes no puede ser negativo"
            );
        }

        if (ingresoMensual.signum() <= 0) {
            throw new IllegalArgumentException(
                    "El ingreso mensual debe ser mayor que cero"
            );
        }

        return gastoTotalMes.divide(
                ingresoMensual,
                ESCALA_RATIO,
                RoundingMode.HALF_UP
        );
    }

    public ResumenFinanciero calcularResumenFinanciero(
            List<TransaccionRequest> transacciones,
            BigDecimal ingresoMensual,
            YearMonth periodo
    ) {
        BigDecimal gastoTotalMes = calcularGastoTotalMes(
                transacciones,
                periodo
        );

        BigDecimal ratioGastoIngreso = calcularRatioGastoIngreso(
                gastoTotalMes,
                ingresoMensual
        );

        return new ResumenFinanciero(
                periodo,
                ingresoMensual,
                gastoTotalMes,
                ratioGastoIngreso,
                MONEDA
        );
    }
}
