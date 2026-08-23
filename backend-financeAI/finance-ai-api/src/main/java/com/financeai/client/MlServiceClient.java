package com.financeai.client;

import com.financeai.dto.AnalisisFinancieroRequest;
import com.financeai.dto.ClasificacionTransaccionesRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Objects;
import java.util.Map;

@Component
public class MlServiceClient {

    private final RestClient restClient;

    /**
     * SimpleClientHttpRequestFactory no trae ningun timeout por defecto: espera para
     * siempre. Sin estos dos valores, un servicio ML trabado (vivo pero sin responder)
     * dejaba el hilo de Tomcat bloqueado de forma indefinida. Cada peticion en ese
     * estado se queda con un hilo del pool, asi que basta con unas pocas para agotarlo
     * y que la API deje de responder por completo -- incluido /api/health, que ni
     * siquiera consulta al ML. En un despliegue con health checks eso se traduce en
     * reinicios en bucle del contenedor.
     *
     * Se configuran por properties para poder ajustarlos por variable de entorno sin
     * recompilar. El connect timeout es corto porque abrir el socket es inmediato
     * cuando el servicio esta sano; el de lectura es mas holgado porque el modelo
     * necesita su tiempo para responder.
     *
     * Al vencer el timeout se lanza ResourceAccessException, que extiende
     * RestClientException y ya la atrapa GlobalExceptionHandler devolviendo 502.
     */
    public MlServiceClient(
            @Value("${financeai.ml.base-url}") String baseUrl,
            @Value("${financeai.ml.connect-timeout:3s}") Duration connectTimeout,
            @Value("${financeai.ml.read-timeout:15s}") Duration readTimeout
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
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
