package com.financeai.domain;

import com.financeai.classification.CategoriaTransaccion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

public record TransaccionClasificada(

        String descripcion,
        BigDecimal valor,
        LocalDate fecha,
        TipoTransaccion tipo,
        CategoriaTransaccion categoria

) {

    public TransaccionClasificada {
        Objects.requireNonNull(
                descripcion,
                "La descripción es obligatoria"
        );

        Objects.requireNonNull(
                valor,
                "El valor es obligatorio"
        );

        Objects.requireNonNull(
                fecha,
                "La fecha es obligatoria"
        );

        Objects.requireNonNull(
                tipo,
                "El tipo de transacción es obligatorio"
        );

        Objects.requireNonNull(
                categoria,
                "La categoría es obligatoria"
        );
    }
}
