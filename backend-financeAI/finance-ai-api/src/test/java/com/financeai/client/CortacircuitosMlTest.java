package com.financeai.client;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas del cortacircuitos con un reloj controlado: nada de Thread.sleep, asi que
 * corren en milisegundos y no dependen de la carga de la maquina.
 */
class CortacircuitosMlTest {

    /** Reloj movible, para simular el paso del tiempo sin esperarlo. */
    private static class RelojDePrueba extends Clock {
        private Instant ahora = Instant.parse("2026-08-23T00:00:00Z");

        void avanzar(Duration cuanto) { ahora = ahora.plus(cuanto); }

        @Override public Instant instant() { return ahora; }
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zona) { return this; }
    }

    private final RelojDePrueba reloj = new RelojDePrueba();

    private CortacircuitosMl nuevo(int umbral) {
        return new CortacircuitosMl(umbral, Duration.ofSeconds(30), reloj);
    }

    @Test
    void empiezaCerradoYDejaPasar() {
        CortacircuitosMl circuito = nuevo(3);

        assertThat(circuito.permitePasar()).isTrue();
        assertThat(circuito.estado()).isEqualTo("CERRADO");
    }

    @Test
    void seAbreAlLlegarAlUmbralDeFallosSeguidos() {
        CortacircuitosMl circuito = nuevo(3);

        circuito.registrarFallo();
        circuito.registrarFallo();
        assertThat(circuito.permitePasar()).as("dos fallos todavia no alcanzan").isTrue();

        circuito.registrarFallo();
        assertThat(circuito.estado()).isEqualTo("ABIERTO");
        assertThat(circuito.permitePasar()).as("al tercer fallo deja de intentar").isFalse();
    }

    @Test
    void unExitoIntermedioReiniciaLaCuenta() {
        CortacircuitosMl circuito = nuevo(3);

        circuito.registrarFallo();
        circuito.registrarFallo();
        circuito.registrarExito();
        circuito.registrarFallo();
        circuito.registrarFallo();

        assertThat(circuito.permitePasar())
                .as("los fallos tienen que ser SEGUIDOS, no acumulados de a ratos")
                .isTrue();
    }

    @Test
    void pasadaLaEsperaDejaPasarUnaSolaSonda() {
        CortacircuitosMl circuito = nuevo(1);
        circuito.registrarFallo();
        assertThat(circuito.permitePasar()).isFalse();

        reloj.avanzar(Duration.ofSeconds(31));

        assertThat(circuito.estado()).isEqualTo("SEMIABIERTO");
        assertThat(circuito.permitePasar()).as("la primera sonda pasa").isTrue();
        assertThat(circuito.permitePasar())
                .as("una sola sonda: el resto sigue cortado mientras se sabe el resultado")
                .isFalse();
    }

    @Test
    void siLaSondaFuncionaElCircuitoSeCierra() {
        CortacircuitosMl circuito = nuevo(1);
        circuito.registrarFallo();
        reloj.avanzar(Duration.ofSeconds(31));
        circuito.permitePasar();

        circuito.registrarExito();

        assertThat(circuito.estado()).isEqualTo("CERRADO");
        assertThat(circuito.permitePasar()).isTrue();
    }

    @Test
    void siLaSondaFallaSeVuelveAAbrirSinEsperarOtroUmbral() {
        CortacircuitosMl circuito = nuevo(5);
        for (int i = 0; i < 5; i++) circuito.registrarFallo();
        reloj.avanzar(Duration.ofSeconds(31));
        circuito.permitePasar();  // pasa la sonda

        circuito.registrarFallo();  // y falla

        assertThat(circuito.estado())
                .as("no hay que juntar 5 fallos de nuevo: ya sabemos que sigue caido")
                .isEqualTo("ABIERTO");
        assertThat(circuito.permitePasar()).isFalse();
    }

    @Test
    void conUmbralCeroQuedaDesactivado() {
        CortacircuitosMl circuito = nuevo(0);

        for (int i = 0; i < 50; i++) circuito.registrarFallo();

        assertThat(circuito.permitePasar())
                .as("umbral 0 es la via de escape para apagarlo por configuracion")
                .isTrue();
        assertThat(circuito.estado()).isEqualTo("CERRADO");
    }
}
