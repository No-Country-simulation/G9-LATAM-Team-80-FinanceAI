package com.financeai.controller;

import com.financeai.client.MlServiceClient;
import com.financeai.persistence.entity.Usuario;
import com.financeai.service.HistorialAnalisisService;
import com.financeai.service.SesionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalisisFinancieroController.class)
class AnalisisFinancieroControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean MlServiceClient mlServiceClient;
    @MockitoBean SesionService sesionService;
    @MockitoBean HistorialAnalisisService historialAnalisisService;

    @Test
    void devuelveElAnalisisDelServicioMl() throws Exception {
        when(mlServiceClient.analizar(any())).thenReturn(Map.of(
                "perfil_financiero", "Saludable",
                "recomendaciones", java.util.List.of()
        ));
        when(sesionService.requerirUsuario("Bearer token-prueba"))
                .thenReturn(new Usuario("Prueba", "prueba@financeai.local", "hash"));

        mockMvc.perform(post("/api/analisis-financiero")
                        .header("Authorization", "Bearer token-prueba")
                        .contentType("application/json")
                        .content("""
                                {
                                  "ingreso_mensual": 4500,
                                  "nivel_endeudamiento": 25,
                                  "frecuencia_ahorro": "Media",
                                  "transacciones": [
                                    {"descripcion":"Supermercado","valor":420,"tipo":"gasto"}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil_financiero").value("Saludable"));
    }
}
