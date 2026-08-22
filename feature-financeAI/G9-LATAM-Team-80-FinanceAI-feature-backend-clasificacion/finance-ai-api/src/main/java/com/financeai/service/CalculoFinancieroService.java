package com.financeai.service;

import com.financeai.classification.CategoriaTransaccion;
import com.financeai.domain.TransaccionClasificada;
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
    private static final BigDecimal CIEN =
            new BigDecimal("100");
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
            List<TransaccionClasificada> transacciones,
            BigDecimal ingresoMensual,
            YearMonth periodo
    ) {
        BigDecimal gastoTotalMes =
                calcularGastoTotalMesExcluyendoDeudas(
                        transacciones,
                        periodo
                );

        BigDecimal totalDeudasMes =
                calcularTotalDeudasMes(
                        transacciones,
                        periodo
                );

        BigDecimal ratioGastoIngreso =
                calcularRatioGastoIngreso(
                        gastoTotalMes,
                        ingresoMensual
                );

        BigDecimal nivelEndeudamiento =
                calcularNivelEndeudamiento(
                        totalDeudasMes,
                        ingresoMensual
                );

        return new ResumenFinanciero(
                periodo,
                ingresoMensual,
                gastoTotalMes,
                totalDeudasMes,
                ratioGastoIngreso,
                nivelEndeudamiento,
                MONEDA
        );
    }

    public BigDecimal calcularTotalDeudasMes(
            List<TransaccionClasificada> transacciones,
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
                        CategoriaTransaccion.DEUDAS
                                == transaccion.categoria()
                )
                .filter(transaccion ->
                        transaccion.fecha() != null
                )
                .filter(transaccion ->
                        YearMonth.from(transaccion.fecha())
                                .equals(periodo)
                )
                .map(TransaccionClasificada::valor)
                .filter(Objects::nonNull)
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                );
    }
    public BigDecimal calcularGastoTotalMesExcluyendoDeudas(
            List<TransaccionClasificada> transacciones,
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
                        CategoriaTransaccion.DEUDAS
                                != transaccion.categoria()
                )
                .filter(transaccion ->
                        transaccion.fecha() != null
                )
                .filter(transaccion ->
                        YearMonth.from(transaccion.fecha())
                                .equals(periodo)
                )
                .map(TransaccionClasificada::valor)
                .filter(Objects::nonNull)
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                );
    }
    public BigDecimal calcularNivelEndeudamiento(
            BigDecimal totalDeudasMes,
            BigDecimal ingresoMensual
    ) {
        Objects.requireNonNull(
                totalDeudasMes,
                "El total de deudas del mes es obligatorio"
        );

        Objects.requireNonNull(
                ingresoMensual,
                "El ingreso mensual es obligatorio"
        );

        if (totalDeudasMes.signum() < 0) {
            throw new IllegalArgumentException(
                    "El total de deudas del mes no puede ser negativo"
            );
        }

        if (ingresoMensual.signum() <= 0) {
            throw new IllegalArgumentException(
                    "El ingreso mensual debe ser mayor que cero"
            );
        }

        return totalDeudasMes
                .multiply(CIEN)
                .divide(
                        ingresoMensual,
                        ESCALA_RATIO,
                        RoundingMode.HALF_UP
                );
    }
}
