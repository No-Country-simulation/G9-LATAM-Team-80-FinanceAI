package com.financeai.controller;

import com.financeai.classification.CategoriaTransaccion;
import com.financeai.classification.ResultadoClasificacion;
import com.financeai.service.ClasificacionTransaccionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClasificacionController.class)
class ClasificacionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClasificacionTransaccionService clasificacionService;

    @Test
    void deberiaClasificarUnaTransaccionValidaSinExponerConfianza()
            throws Exception {

        ResultadoClasificacion resultado = new ResultadoClasificacion(
                CategoriaTransaccion.TRANSPORTE,
                0.70,
                1,
                List.of("uber")
        );

        when(clasificacionService.clasificar("Uber al trabajo"))
                .thenReturn(resultado);

        String solicitud = """
                {
                  "transacciones": [
                    {
                      "descripcion": "Uber al trabajo",
                      "valor": 45.00,
                      "fecha": "2026-07-26",
                      "tipo": "GASTO"
                    }
                  ]
                }
                """;

        mockMvc.perform(post("/api/clasificar-transacciones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(solicitud))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadTransacciones")
                        .value(1))
                .andExpect(jsonPath("$.transacciones[0].descripcion")
                        .value("Uber al trabajo"))
                .andExpect(jsonPath("$.transacciones[0].valor")
                        .value(45.00))
                .andExpect(jsonPath("$.transacciones[0].fecha")
                        .value("2026-07-26"))
                .andExpect(jsonPath("$.transacciones[0].moneda")
                        .value("USD"))
                .andExpect(jsonPath("$.transacciones[0].tipo")
                        .value("GASTO"))
                .andExpect(jsonPath("$.transacciones[0].categoria")
                        .value("transporte"))
                .andExpect(jsonPath("$.transacciones[0].confianza")
                        .doesNotExist());

        verify(clasificacionService).clasificar("Uber al trabajo");
    }

    @Test
    void deberiaDevolverBadRequestCuandoLosDatosSonInvalidos()
            throws Exception {

        LocalDate fechaFutura = LocalDate.now().plusDays(1);

        String solicitud = """
                {
                  "transacciones": [
                    {
                      "descripcion": "",
                      "valor": 0,
                      "fecha": "%s"
                    }
                  ]
                }
                """.formatted(fechaFutura);

        mockMvc.perform(post("/api/clasificar-transacciones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(solicitud))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status")
                        .value(400))
                .andExpect(jsonPath("$.mensaje")
                        .value("Los datos enviados no son válidos"))
                .andExpect(jsonPath("$.errores")
                        .isMap())
                .andExpect(jsonPath(
                        "$['errores']['transacciones[0].tipo']"
                ).value("El tipo de transacción es obligatorio"));
    }

    @Test
    void deberiaDevolverBadRequestCuandoElTipoNoExiste()
            throws Exception {

        String solicitud = """
                {
                  "transacciones": [
                    {
                      "descripcion": "Uber al trabajo",
                      "valor": 45.00,
                      "fecha": "2026-07-26",
                      "tipo": "COMPRA"
                    }
                  ]
                }
                """;

        mockMvc.perform(post("/api/clasificar-transacciones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(solicitud))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status")
                        .value(400))
                .andExpect(jsonPath("$.mensaje")
                        .value("El cuerpo de la solicitud no es válido"))
                .andExpect(jsonPath("$.errores.solicitud")
                        .value(
                                "Verifique el formato JSON y los valores enviados"
                        ));
    }
}
