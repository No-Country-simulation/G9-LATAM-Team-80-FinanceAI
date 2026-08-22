package com.financeai.client;

import com.financeai.dto.AnalisisFinancieroRequest;
import com.financeai.dto.ClasificacionTransaccionesRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.Objects;
import java.util.Map;

@Component
public class MlServiceClient {

    private final RestClient restClient;

    public MlServiceClient(@Value("${financeai.ml.base-url}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(new SimpleClientHttpRequestFactory())
                .build();
    }

    public Map<String, Object> analizar(AnalisisFinancieroRequest request) {
        return enviar("/analisis-financiero", request);
    }

    public Map<String, Object> clasificar(ClasificacionTransaccionesRequest request) {
        return enviar("/clasificar-transacciones", request);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> enviar(String uri, Object request) {
        Map<String, Object> respuesta = restClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(Map.class);

        return Objects.requireNonNull(respuesta, "El servicio ML devolvio una respuesta vacia");
    }
}
