package com.financeai.client;

import com.financeai.dto.clasificacion.ClasificadorGastosRequest;
import com.financeai.dto.clasificacion.ClasificadorGastosResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ClasificadorGastosClientTest {

    private MockRestServiceServer server;
    private ClasificadorGastosClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("http://localhost:8000");

        server = MockRestServiceServer.bindTo(builder).build();
        client = new ClasificadorGastosClient(builder.build());
    }

    @Test
    void deberiaEnviarLaDescripcionYConvertirLaRespuesta() {
        String respuestaMl = """
                {
                  "categoria": "transporte",
                  "confianza": 0.98
                }
                """;

        server.expect(
                        once(),
                        requestTo(
                                "http://localhost:8000/clasificar-transaccion"
                        )
                )
                .andExpect(method(HttpMethod.POST))
                .andExpect(
                        content().contentType(
                                MediaType.APPLICATION_JSON
                        )
                )
                .andExpect(
                        content().json("""
                                {
                                  "descripcion": "Uber al trabajo"
                                }
                                """)
                )
                .andRespond(
                        withSuccess(
                                respuestaMl,
                                MediaType.APPLICATION_JSON
                        )
                );

        ClasificadorGastosResponse respuesta =
                client.clasificar(
                        new ClasificadorGastosRequest(
                                "Uber al trabajo"
                        )
                );

        assertThat(respuesta.categoria())
                .isEqualTo("transporte");

        assertThat(respuesta.confianza())
                .isEqualTo(0.98);

        server.verify();
    }

    @Test
    void deberiaRechazarUnaSolicitudNula() {
        assertThatThrownBy(
                () -> client.clasificar(null)
        )
                .isInstanceOf(NullPointerException.class)
                .hasMessage(
                        "La solicitud de clasificación es obligatoria"
                );

        server.verify();
    }
}
