package com.financeai.mapper;

import com.financeai.dto.analisis.AnalisisFinancieroResponse;
import com.financeai.dto.perfil.PerfilFinancieroMetricasResponse;
import com.financeai.dto.perfil.PerfilFinancieroResponse;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PerfilFinancieroMapperTest {

    private final PerfilFinancieroMapper mapper =
            new PerfilFinancieroMapper();

    private final ObjectMapper objectMapper =
            new ObjectMapper();

    @Test
    void deberiaExponerLaProbabilidadSinMostrarCamposInternos()
            throws Exception {

        PerfilFinancieroMetricasResponse metricas =
                new PerfilFinancieroMetricasResponse(
                        0.50,
                        20.0,
                        "Alta",
                        0.30
                );

        PerfilFinancieroResponse respuestaInterna =
                new PerfilFinancieroResponse(
                        "Saludable",
                        0.98,
                        List.of(
                                "Endeudamiento controlado",
                                "Gasto razonable frente al ingreso"
                        ),
                        metricas,
                        null,
                        "reglas (veredicto) + modelo (confianza)"
                );

        AnalisisFinancieroResponse respuestaPublica =
                mapper.toPublicResponse(respuestaInterna);

        assertThat(respuestaPublica.perfilFinanciero())
                .isEqualTo("Saludable");

        assertThat(respuestaPublica.probabilidad())
                .isEqualTo(0.98);

        assertThat(respuestaPublica.razones())
                .hasSize(2);

        assertThat(respuestaPublica.metricas())
                .isEqualTo(metricas);

        String json = objectMapper.writeValueAsString(
                respuestaPublica
        );

        assertThat(json)
                .contains("\"probabilidad\":0.98")
                .doesNotContain("_inconsistencia_ahorro")
                .doesNotContain("_fuente_prediccion");
    }
}
