package com.financeai.client;

import com.financeai.dto.AnalisisFinancieroRequest;
import com.financeai.dto.ClasificacionTransaccionesRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.Map;

@Component
public class MlServiceClient {

    private static final Logger log = LoggerFactory.getLogger(MlServiceClient.class);

    private final RestClient restClient;
    private final CortacircuitosMl cortacircuitos;

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
    // @Autowired explicito: al haber dos constructores, Spring no puede elegir solo y
    // termina buscando uno vacio que no existe.
    @Autowired
    public MlServiceClient(
            @Value("${financeai.ml.base-url}") String baseUrl,
            @Value("${financeai.ml.connect-timeout:3s}") Duration connectTimeout,
            @Value("${financeai.ml.read-timeout:15s}") Duration readTimeout,
            @Value("${financeai.ml.circuito.fallos-para-abrir:5}") int fallosParaAbrir,
            @Value("${financeai.ml.circuito.espera:30s}") Duration esperaDelCircuito
    ) {
        this(baseUrl, connectTimeout, readTimeout,
                new CortacircuitosMl(fallosParaAbrir, esperaDelCircuito, Clock.systemUTC()));
    }

    /** Constructor para pruebas: permite inyectar un cortacircuitos con reloj controlado. */
    MlServiceClient(String baseUrl, Duration connectTimeout, Duration readTimeout, CortacircuitosMl cortacircuitos) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.cortacircuitos = cortacircuitos;
    }

    public Map<String, Object> analizar(AnalisisFinancieroRequest request) {
        return enviar("/analisis-financiero", request);
    }

    public Map<String, Object> clasificar(ClasificacionTransaccionesRequest request) {
        return enviar("/clasificar-transacciones", request);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> enviar(String uri, Object request) {
        // Cortar antes de intentar: con el ML caido, esperar el read timeout en cada
        // peticion mantiene hilos de Tomcat ocupados sin ninguna posibilidad de exito.
        if (!cortacircuitos.permitePasar()) {
            log.warn("Cortacircuitos abierto, no se llama a {}. Se responde 502 sin intentar.", uri);
            throw new MlNoDisponibleException(
                    "El servicio de analisis no responde; las llamadas estan suspendidas temporalmente");
        }

        try {
            Map<String, Object> respuesta = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(Map.class);

            Map<String, Object> confirmada =
                    Objects.requireNonNull(respuesta, "El servicio ML devolvio una respuesta vacia");
            cortacircuitos.registrarExito();
            return confirmada;
        } catch (RuntimeException error) {
            // Una respuesta vacia tambien cuenta como fallo: el ML contesto, pero no sirve.
            cortacircuitos.registrarFallo();
            log.warn("Fallo la llamada a {} ({}). Cortacircuitos: {}",
                    uri, error.getClass().getSimpleName(), cortacircuitos.estado());
            throw error;
        }
    }
}
