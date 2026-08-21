package com.financeai.service;

import com.financeai.classification.ResultadoClasificacion;
import com.financeai.client.ClasificadorGastosClient;
import com.financeai.dto.clasificacion.ClasificadorGastosRequest;
import com.financeai.dto.clasificacion.ClasificadorGastosResponse;
import com.financeai.mapper.CategoriaTransaccionMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClasificacionTransaccionService {

    private final ClasificadorGastosClient clasificadorGastosClient;
    private final CategoriaTransaccionMapper categoriaMapper;

    public ClasificacionTransaccionService(
            ClasificadorGastosClient clasificadorGastosClient,
            CategoriaTransaccionMapper categoriaMapper
    ) {
        this.clasificadorGastosClient = clasificadorGastosClient;
        this.categoriaMapper = categoriaMapper;
    }

    public ResultadoClasificacion clasificar(String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new IllegalArgumentException(
                    "La descripción de la transacción es obligatoria"
            );
        }

        ClasificadorGastosResponse respuesta =
                clasificadorGastosClient.clasificar(
                        new ClasificadorGastosRequest(descripcion.trim())
                );

        return new ResultadoClasificacion(
                categoriaMapper.desdeCodigo(respuesta.categoria()),
                respuesta.confianza(),
                0,
                List.of()
        );
    }
}
