package com.financeai.client;

import com.financeai.dto.perfil.PerfilFinancieroRequest;
import com.financeai.dto.perfil.PerfilFinancieroResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PerfilFinancieroClientTest {

    private MockRestServiceServer server;
    private PerfilFinancieroClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("http://localhost:8000");

        server = MockRestServiceServer.bindTo(builder).build();
        client = new PerfilFinancieroClient(builder.build());
    }

    @Test
    void deberiaEnviarLasMetricasYConvertirLaRespuestaDelPerfil() {
        String respuestaMl = """
                {
                  "perfil_financiero": "Saludable",
                  "probabilidad": 0.98,
                  "razones": [
                    "Endeudamiento controlado",
                    "Gasto razonable frente al ingreso"
                  ],
                  "metricas": {
                    "ratio_gasto_ingreso": 0.5,
                    "nivel_endeudamiento": 20.0,
                    "frecuencia_ahorro": "Alta",
                    "ahorro_estimado_pct": 0.3
                  },
                  "_inconsistencia_ahorro": null,
                  "_fuente_prediccion": "reglas y modelo"
                }
                """;

        server.expect(once(), requestTo(
                        "http://localhost:8000/perfil-financiero"
                ))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "ingreso_mensual": 1000.00,
                          "gasto_total_mes": 500.00,
                          "nivel_endeudamiento": 20.0000
                        }
                        """))
                .andRespond(withSuccess(
                        respuestaMl,
                        MediaType.APPLICATION_JSON
                ));

        PerfilFinancieroRequest request =
                new PerfilFinancieroRequest(
                        new BigDecimal("1000.00"),
                        new BigDecimal("500.00"),
                        new BigDecimal("20.0000")
                );

        PerfilFinancieroResponse resultado = client.analizar(request);

        assertThat(resultado.perfilFinanciero())
                .isEqualTo("Saludable");

        assertThat(resultado.probabilidad())
                .isEqualTo(0.98);

        assertThat(resultado.razones())
                .hasSize(2);

        assertThat(resultado.metricas().ratioGastoIngreso())
                .isEqualTo(0.5);

        assertThat(resultado.metricas().nivelEndeudamiento())
                .isEqualTo(20.0);

        assertThat(resultado.metricas().ahorroEstimadoPct())
                .isEqualTo(0.3);

        server.verify();
    }

    @Test
    void deberiaRechazarUnaSolicitudNula() {
        assertThatNullPointerException()
                .isThrownBy(() -> client.analizar(null))
                .withMessage(
                        "La solicitud del perfil financiero es obligatoria"
                );
    }
}
