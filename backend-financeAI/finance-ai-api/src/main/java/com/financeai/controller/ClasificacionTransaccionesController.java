package com.financeai.controller;

import com.financeai.client.MlServiceClient;
import com.financeai.dto.ClasificacionTransaccionesRequest;
import com.financeai.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ClasificacionTransaccionesController {
    private final MlServiceClient mlServiceClient;
    private final SesionService sesiones;

    public ClasificacionTransaccionesController(MlServiceClient mlServiceClient, SesionService sesiones) {
        this.mlServiceClient = mlServiceClient;
        this.sesiones = sesiones;
    }

    @PostMapping("/clasificar-transacciones")
    public Map<String, Object> clasificar(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody ClasificacionTransaccionesRequest request
    ) {
        sesiones.requerirUsuario(authorization);
        return mlServiceClient.clasificar(request);
    }
}
