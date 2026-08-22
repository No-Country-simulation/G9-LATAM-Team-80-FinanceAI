package com.financeai.client;

import com.financeai.dto.clasificacion.ClasificadorGastosRequest;
import com.financeai.dto.clasificacion.ClasificadorGastosResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Objects;

@Component
public class ClasificadorGastosClient {

    private static final String CLASIFICADOR_PATH =
            "/clasificar-transaccion";

    private final RestClient mlRestClient;

    public ClasificadorGastosClient(
            @Qualifier("mlRestClient") RestClient mlRestClient
    ) {
        this.mlRestClient = mlRestClient;
    }

    public ClasificadorGastosResponse clasificar(
            ClasificadorGastosRequest request
    ) {
        Objects.requireNonNull(
                request,
                "La solicitud de clasificación es obligatoria"
        );

        ClasificadorGastosResponse response = mlRestClient.post()
                .uri(CLASIFICADOR_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ClasificadorGastosResponse.class);

        return Objects.requireNonNull(
                response,
                "El clasificador de gastos devolvió una respuesta vacía"
        );
    }
}
