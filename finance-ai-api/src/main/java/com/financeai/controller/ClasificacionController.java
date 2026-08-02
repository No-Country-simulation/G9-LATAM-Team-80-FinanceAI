package com.financeai.controller;

import com.financeai.classification.ResultadoClasificacion;
import com.financeai.dto.ClasificarTransaccionesRequest;
import com.financeai.dto.ClasificarTransaccionesResponse;
import com.financeai.dto.TransaccionClasificadaResponse;
import com.financeai.dto.TransaccionRequest;
import com.financeai.service.ClasificacionTransaccionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ClasificacionController {

    private static final String MONEDA = "USD";

    private final ClasificacionTransaccionService clasificacionService;

    public ClasificacionController(
            ClasificacionTransaccionService clasificacionService
    ) {
        this.clasificacionService = clasificacionService;
    }

    @PostMapping("/api/clasificar-transacciones")
    public ClasificarTransaccionesResponse clasificarTransacciones(
            @Valid @RequestBody ClasificarTransaccionesRequest request
    ) {
        List<TransaccionClasificadaResponse> transaccionesClasificadas =
                request.transacciones()
                        .stream()
                        .map(this::clasificarTransaccion)
                        .toList();

        return new ClasificarTransaccionesResponse(
                transaccionesClasificadas.size(),
                transaccionesClasificadas
        );
    }

    private TransaccionClasificadaResponse clasificarTransaccion(
            TransaccionRequest transaccion
    ) {
        ResultadoClasificacion resultado =
                clasificacionService.clasificar(transaccion.descripcion());

        return new TransaccionClasificadaResponse(
                transaccion.descripcion(),
                transaccion.valor(),
                transaccion.fecha(),
                MONEDA,
                transaccion.tipo(),
                resultado.categoria().getNombreVisible()
        );
    }
}
