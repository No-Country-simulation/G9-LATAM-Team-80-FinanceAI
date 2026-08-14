package com.financeai.controller;

import com.financeai.client.MlServiceClient;
import com.financeai.persistence.entity.Usuario;
import com.financeai.service.SesionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClasificacionTransaccionesController.class)
class ClasificacionTransaccionesControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean MlServiceClient mlServiceClient;
    @MockitoBean SesionService sesionService;

    @Test
    void clasificaUnLoteConElServicioMl() throws Exception {
        when(sesionService.requerirUsuario("Bearer token-prueba"))
                .thenReturn(new Usuario("Prueba", "prueba@financeai.local", "hash"));
        when(mlServiceClient.clasificar(any())).thenReturn(Map.of(
                "clasificaciones", List.of(Map.of(
                        "descripcion", "Supermercado",
                        "valor", 420,
                        "categoria", "alimentacion"
                ))
        ));

        mockMvc.perform(post("/api/clasificar-transacciones")
                        .header("Authorization", "Bearer token-prueba")
                        .contentType("application/json")
                        .content("""
                                {
                                  "transacciones": [
                                    {"descripcion":"Supermercado","valor":420}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasificaciones[0].categoria").value("alimentacion"));
    }
}
