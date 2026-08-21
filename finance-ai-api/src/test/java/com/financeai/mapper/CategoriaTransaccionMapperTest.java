package com.financeai.mapper;

import com.financeai.classification.CategoriaTransaccion;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class CategoriaTransaccionMapperTest {

    private final CategoriaTransaccionMapper mapper =
            new CategoriaTransaccionMapper();

    @Test
    void deberiaConvertirElCodigoDelModeloAlEnum() {
        CategoriaTransaccion resultado =
                mapper.desdeCodigo("transporte");

        assertThat(resultado)
                .isEqualTo(CategoriaTransaccion.TRANSPORTE);
    }

    @Test
    void deberiaNormalizarEspaciosYMayusculas() {
        CategoriaTransaccion resultado =
                mapper.desdeCodigo("  IMPUESTOS_Y_SEGUROS  ");

        assertThat(resultado)
                .isEqualTo(CategoriaTransaccion.IMPUESTOS_Y_SEGUROS);
    }

    @Test
    void deberiaRechazarUnaCategoriaDesconocida() {
        assertThatIllegalArgumentException()
                .isThrownBy(() ->
                        mapper.desdeCodigo("categoria_inexistente")
                )
                .withMessage(
                        "Categoría desconocida devuelta por ML: categoria_inexistente"
                );
    }

    @Test
    void deberiaRechazarUnaCategoriaNula() {
        assertThatNullPointerException()
                .isThrownBy(() -> mapper.desdeCodigo(null))
                .withMessage(
                        "La categoría devuelta por ML es obligatoria"
                );
    }
}
