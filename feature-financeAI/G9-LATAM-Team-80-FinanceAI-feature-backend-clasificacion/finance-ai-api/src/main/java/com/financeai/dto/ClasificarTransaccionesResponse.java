package com.financeai.dto;

import java.util.List;

public record ClasificarTransaccionesResponse(

        int cantidadTransacciones,
        List<TransaccionClasificadaResponse> transacciones
) {
}
