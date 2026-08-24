package com.financeai.dto;

import com.financeai.dto.PersistenciaDtos.PresupuestoLoteRequest;
import com.financeai.dto.PersistenciaDtos.PresupuestoRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Un limite invalido no llega a la base de datos.
 *
 * Importa sobre todo en el lote: la validacion corre sobre la peticion entera antes de
 * abrir la transaccion, asi que una sola categoria mal puesta tumba las doce y no deja
 * el mes configurado a medias.
 */
class PresupuestoRequestValidacionTest {

    private static ValidatorFactory fabrica;
    private static Validator validador;

    @BeforeAll static void abrir() {
        fabrica = Validation.buildDefaultValidatorFactory();
        validador = fabrica.getValidator();
    }

    @AfterAll static void cerrar() {
        if (fabrica != null) fabrica.close();
    }

    private static PresupuestoRequest limite(String categoria, String monto) {
        return new PresupuestoRequest(categoria, monto == null ? null : new BigDecimal(monto));
    }

    @Test
    void aceptaUnLimitePositivoDeUnaCategoriaOficial() {
        assertThat(validador.validate(limite("vivienda", "1300000"))).isEmpty();
    }

    @Test
    void rechazaCategoriaFueraDelCatalogo() {
        assertThat(validador.validate(limite("banana", "1000"))).isNotEmpty();
    }

    @Test
    void rechazaMontoCeroONegativo() {
        assertThat(validador.validate(limite("salud", "0"))).isNotEmpty();
        assertThat(validador.validate(limite("salud", "-5000"))).isNotEmpty();
    }

    @Test
    void rechazaMontoAusente() {
        assertThat(validador.validate(limite("salud", null))).isNotEmpty();
    }

    /** DECIMAL(15,2) da trece cifras enteras; una mas reventaba al insertar. */
    @Test
    void rechazaMontoQueNoCabeEnLaColumna() {
        assertThat(validador.validate(limite("salud", "9999999999999.99"))).isEmpty();
        assertThat(validador.validate(limite("salud", "10000000000000"))).isNotEmpty();
    }

    @Test
    void rechazaMasDeDosDecimales() {
        assertThat(validador.validate(limite("salud", "1000.999"))).isNotEmpty();
    }

    @Test
    void unSoloLimiteInvalidoTumbaElLoteEntero() {
        PresupuestoLoteRequest lote = new PresupuestoLoteRequest(List.of(
                limite("vivienda", "1300000"),
                limite("alimentacion", "600000"),
                limite("banana", "300000")
        ));
        assertThat(validador.validate(lote)).isNotEmpty();
    }

    @Test
    void rechazaUnLoteVacio() {
        assertThat(validador.validate(new PresupuestoLoteRequest(List.of()))).isNotEmpty();
    }
}
