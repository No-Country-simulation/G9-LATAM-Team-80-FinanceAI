package com.financeai.controller;

import com.financeai.client.MlServiceClient;
import com.financeai.dto.AnalisisFinancieroRequest;
import com.financeai.persistence.entity.Usuario;
import com.financeai.service.HistorialAnalisisService;
import com.financeai.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AnalisisFinancieroController {

    private final MlServiceClient mlServiceClient;
    private final SesionService sesiones;
    private final HistorialAnalisisService historial;

    public AnalisisFinancieroController(MlServiceClient mlServiceClient, SesionService sesiones, HistorialAnalisisService historial) {
        this.mlServiceClient = mlServiceClient;
        this.sesiones = sesiones;
        this.historial = historial;
    }

    /**
     * guardarHistorial en false por defecto a proposito: un analisis se pide constantemente
     * de forma automatica (al abrir la app, al cambiar de periodo, al editar una
     * transaccion) solo para refrescar lo que se ve en pantalla, y eso no es una decision
     * de la persona de guardar un snapshot. Solo el frontend manda true, y solo cuando la
     * persona pulsa "Actualizar analisis" explicitamente.
     */
    @PostMapping("/analisis-financiero")
    public Map<String, Object> analizar(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(name = "guardarHistorial", defaultValue = "false") boolean guardarHistorial,
            @Valid @RequestBody AnalisisFinancieroRequest request
    ) {
        Usuario usuario = sesiones.requerirUsuario(authorization);
        Map<String, Object> resultado = mlServiceClient.analizar(request);
        if (guardarHistorial) {
            historial.guardar(usuario, request, resultado);
        }
        return resultado;
    }
}
