package com.financeai.client;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Cortacircuitos para las llamadas al servicio ML.
 *
 * Los timeouts de MlServiceClient acotan el dano de una llamada, pero no lo evitan:
 * con el ML caido, cada peticion sigue ocupando un hilo de Tomcat durante todo el read
 * timeout. Con trafico suficiente el pool se estrecha igual, solo que ahora se recupera.
 *
 * Este cortacircuitos corta antes de intentar: despues de varios fallos seguidos deja de
 * llamar al ML por un rato y falla al instante, sin gastar un hilo esperando. Pasado ese
 * rato deja pasar UNA sola peticion de sonda para ver si el servicio volvio.
 *
 * Estados:
 *   CERRADO     todo pasa. Es el estado normal.
 *   ABIERTO     nada pasa, se falla al instante. Se entra tras N fallos seguidos.
 *   SEMIABIERTO pasa una sola sonda. Si funciona se cierra; si falla se vuelve a abrir.
 *
 * Los metodos son synchronized a proposito: la contencion es despreciable al lado de una
 * llamada de red, y asi el conteo de fallos no se corrompe con varios hilos a la vez.
 *
 * Con umbralFallos = 0 queda desactivado, para poder apagarlo por configuracion sin
 * tocar codigo.
 */
class CortacircuitosMl {

    private final int umbralFallos;
    private final Duration esperaAntesDeSondear;
    private final Clock reloj;

    private int fallosSeguidos;
    private Instant cerradoHasta;
    private boolean sondaEnCurso;

    CortacircuitosMl(int umbralFallos, Duration esperaAntesDeSondear, Clock reloj) {
        this.umbralFallos = umbralFallos;
        this.esperaAntesDeSondear = esperaAntesDeSondear;
        this.reloj = reloj;
    }

    /** true si la llamada puede intentarse; false si hay que fallar al instante. */
    synchronized boolean permitePasar() {
        if (estaDesactivado() || cerradoHasta == null) {
            return true;
        }
        if (reloj.instant().isBefore(cerradoHasta)) {
            return false;  // ABIERTO
        }
        if (sondaEnCurso) {
            return false;  // SEMIABIERTO y ya hay otro hilo sondeando
        }
        sondaEnCurso = true;
        return true;       // SEMIABIERTO: pasa esta unica sonda
    }

    synchronized void registrarExito() {
        fallosSeguidos = 0;
        cerradoHasta = null;
        sondaEnCurso = false;
    }

    synchronized void registrarFallo() {
        if (estaDesactivado()) {
            return;
        }
        fallosSeguidos++;
        // Si el que fallo era la sonda, se vuelve a abrir sin esperar a juntar el umbral
        // otra vez: ya sabemos que el servicio sigue mal.
        if (sondaEnCurso || fallosSeguidos >= umbralFallos) {
            sondaEnCurso = false;
            cerradoHasta = reloj.instant().plus(esperaAntesDeSondear);
        }
    }

    /** Solo para logs y pruebas. */
    synchronized String estado() {
        if (estaDesactivado() || cerradoHasta == null) {
            return "CERRADO";
        }
        return reloj.instant().isBefore(cerradoHasta) ? "ABIERTO" : "SEMIABIERTO";
    }

    private boolean estaDesactivado() {
        return umbralFallos <= 0;
    }
}
