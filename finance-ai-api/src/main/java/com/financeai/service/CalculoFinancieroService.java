package com.financeai.service;

import com.financeai.domain.TipoTransaccion;
import com.financeai.dto.TransaccionRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;

@Service
public class CalculoFinancieroService {

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
}
