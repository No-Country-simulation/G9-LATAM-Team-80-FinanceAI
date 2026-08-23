package com.financeai.client;

import com.financeai.dto.AnalisisFinancieroRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.ServerSocket;
import java.net.Socket;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Protege el timeout de MlServiceClient.
 *
 * Antes de este test, el cliente se construia con un SimpleClientHttpRequestFactory sin
 * configurar, que no tiene ningun timeout: espera indefinidamente. Un servicio ML vivo
 * pero trabado dejaba el hilo de Tomcat bloqueado para siempre, y con unas pocas
 * peticiones asi se agotaba el pool y la API entera dejaba de responder, incluido
 * /api/health.
 *
 * El test levanta un servidor que acepta la conexion y nunca contesta -- el caso peor,
 * porque el socket abre bien y solo lo corta un read timeout. Si alguien quita los
 * timeouts del constructor, este test deja de terminar y falla por su propio limite.
 */
class MlServiceClientTimeoutTest {

    private ServerSocket servidorMudo;
    private ExecutorService hilos;

    @BeforeEach
    void levantarServidorMudo() throws IOException {
        servidorMudo = new ServerSocket(0);  // puerto libre que elige el sistema
        // Hilos demonio a proposito: una lectura de socket bloqueada no responde a
        // interrupciones, asi que si alguien quita los timeouts del cliente estos hilos
        // quedarian colgados. Siendo demonio no impiden que la JVM termine y la suite
        // corta enseguida en vez de esperarlos.
        hilos = Executors.newCachedThreadPool(tarea -> {
            Thread hilo = new Thread(tarea, "ml-mudo");
            hilo.setDaemon(true);
            return hilo;
        });
        hilos.submit(() -> {
            while (!servidorMudo.isClosed()) {
                try {
                    Socket conexion = servidorMudo.accept();
                    // Se acepta y no se responde nunca. Tampoco se cierra: cerrar
                    // provocaria un fin de stream y el cliente fallaria por otro motivo.
                    hilos.submit(() -> {
                        try { Thread.sleep(300_000L); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
                        try { conexion.close(); } catch (IOException ignored) { }
                    });
                } catch (IOException cerrado) {
                    return;
                }
            }
        });
    }

    @AfterEach
    void apagarServidorMudo() throws IOException {
        servidorMudo.close();
        hilos.shutdownNow();
    }

    // Sin este limite, quitar los timeouts del constructor colgaria la suite en vez de
    // fallarla: el test se quedaria esperando igual que se quedaba Tomcat en produccion.
    @Test
    @Timeout(value = 30, unit = TimeUnit.SECONDS)
    void cortaCuandoElServicioMlNoResponde() {
        MlServiceClient cliente = new MlServiceClient(
                "http://127.0.0.1:" + servidorMudo.getLocalPort(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(2),
                new CortacircuitosMl(0, Duration.ZERO, Clock.systemUTC())  // desactivado: aqui se prueba solo el timeout
        );

        long inicio = System.nanoTime();
        assertThatThrownBy(() -> cliente.analizar(peticionDeEjemplo()))
                .isInstanceOf(RestClientException.class);
        Duration transcurrido = Duration.ofNanos(System.nanoTime() - inicio);

        // GlobalExceptionHandler traduce RestClientException a 502, asi que el usuario
        // recibe un error claro en vez de quedarse esperando.
        assertThat(transcurrido)
                .as("debe cortar cerca del read timeout de 2s, no esperar indefinidamente")
                .isLessThan(Duration.ofSeconds(20));
    }

    /**
     * Lo que de verdad importa del cortacircuitos: con el circuito abierto la llamada
     * ni siquiera intenta abrir el socket, asi que no gasta un hilo esperando el read
     * timeout. Se mide por tiempo -- 2 llamadas con timeout de 2s tardarian mas de 4s
     * si ambas salieran a la red.
     */
    @Test
    @Timeout(value = 30, unit = TimeUnit.SECONDS)
    void conElCircuitoAbiertoFallaAlInstanteSinLlamarAlServicio() {
        MlServiceClient cliente = new MlServiceClient(
                "http://127.0.0.1:" + servidorMudo.getLocalPort(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(2),
                new CortacircuitosMl(1, Duration.ofMinutes(5), Clock.systemUTC())  // abre al primer fallo
        );

        // Primera llamada: sale a la red y agota el read timeout. Con eso abre el circuito.
        assertThatThrownBy(() -> cliente.analizar(peticionDeEjemplo()))
                .isInstanceOf(RestClientException.class);

        long inicio = System.nanoTime();
        assertThatThrownBy(() -> cliente.analizar(peticionDeEjemplo()))
                .as("la segunda ya no debe intentar")
                .isInstanceOf(MlNoDisponibleException.class);
        Duration segunda = Duration.ofNanos(System.nanoTime() - inicio);

        assertThat(segunda)
                .as("debe fallar al instante, no volver a esperar los 2s del read timeout")
                .isLessThan(Duration.ofMillis(500));
    }

    private AnalisisFinancieroRequest peticionDeEjemplo() {
        return new AnalisisFinancieroRequest(
                new BigDecimal("5000000"),
                new BigDecimal("20"),
                "Media",
                // La categoria no interviene en lo que prueba esta clase (el timeout).
                List.of(new AnalisisFinancieroRequest.TransaccionAnalisisRequest(
                        "Gastos del mes", new BigDecimal("2750000"), "gasto", "otros"))
        );
    }
}
