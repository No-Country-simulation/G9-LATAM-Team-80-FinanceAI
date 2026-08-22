package com.financeai.mapper;

import com.financeai.domain.ResumenFinanciero;
import com.financeai.dto.perfil.PerfilFinancieroRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PerfilFinancieroRequestMapperTest {

    private final PerfilFinancieroRequestMapper mapper =
            new PerfilFinancieroRequestMapper();

    @Test
    void deberiaConvertirElResumenAlContratoDelPerfilFinanciero() {
        ResumenFinanciero resumen = new ResumenFinanciero(
                YearMonth.of(2026, 8),
                new BigDecimal("1000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("200.00"),
                new BigDecimal("0.5000"),
                new BigDecimal("20.0000"),
                "USD"
        );

        PerfilFinancieroRequest resultado = mapper.toRequest(resumen);

        assertThat(resultado.ingresoMensual())
                .isEqualByComparingTo("1000.00");

        assertThat(resultado.gastoTotalMes())
                .isEqualByComparingTo("500.00");

        assertThat(resultado.nivelEndeudamiento())
                .isEqualByComparingTo("20.0000");
    }

    @Test
    void deberiaRechazarUnResumenFinancieroNulo() {
        assertThatThrownBy(() -> mapper.toRequest(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("El resumen financiero es obligatorio");
    }
}
