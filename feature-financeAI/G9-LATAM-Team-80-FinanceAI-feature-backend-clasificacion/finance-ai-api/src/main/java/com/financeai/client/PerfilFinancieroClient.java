package com.financeai.client;

import com.financeai.dto.perfil.PerfilFinancieroRequest;
import com.financeai.dto.perfil.PerfilFinancieroResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Objects;

@Component
public class PerfilFinancieroClient {

    private static final String PERFIL_FINANCIERO_PATH =
            "/perfil-financiero";

    private final RestClient mlRestClient;

    public PerfilFinancieroClient(
            @Qualifier("mlRestClient") RestClient mlRestClient
    ) {
        this.mlRestClient = mlRestClient;
    }

    public PerfilFinancieroResponse analizar(
            PerfilFinancieroRequest request
    ) {
        Objects.requireNonNull(
                request,
                "La solicitud del perfil financiero es obligatoria"
        );

        PerfilFinancieroResponse response = mlRestClient.post()
                .uri(PERFIL_FINANCIERO_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(PerfilFinancieroResponse.class);

        return Objects.requireNonNull(
                response,
                "El servicio de perfil financiero devolvió una respuesta vacía"
        );
    }
}
