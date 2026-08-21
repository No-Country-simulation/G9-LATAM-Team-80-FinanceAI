package com.financeai.mapper;

import com.financeai.classification.CategoriaTransaccion;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;

@Component
public class CategoriaTransaccionMapper {

    public CategoriaTransaccion desdeCodigo(String codigo) {
        Objects.requireNonNull(
                codigo,
                "La categoría devuelta por ML es obligatoria"
        );

        String codigoNormalizado = codigo
                .trim()
                .toLowerCase(Locale.ROOT);

        return Arrays.stream(CategoriaTransaccion.values())
                .filter(categoria ->
                        categoria.getCodigo().equals(codigoNormalizado)
                )
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Categoría desconocida devuelta por ML: " + codigo
                ));
    }
}
