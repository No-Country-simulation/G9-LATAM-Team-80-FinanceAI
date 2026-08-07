package com.financeai.service;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.financeai.classification.CategoriaTransaccion;
import com.financeai.classification.ResultadoClasificacion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClasificacionTransaccionServiceTest {

    private ClasificacionTransaccionService service;

    @BeforeEach
    void setUp() {
        service = new ClasificacionTransaccionService();
    }

    @Test
    void deberiaClasificarUberComoTransporte() {
        ResultadoClasificacion resultado = service.clasificar("Viaje en Uber al trabajo");

        assertThat(resultado.categoria()).isEqualTo(CategoriaTransaccion.TRANSPORTE);
        assertThat(resultado.puntuacion()).isEqualTo(1);
        assertThat(resultado.confianza()).isEqualTo(0.70);
        assertThat(resultado.coincidencias()).containsExactly("uber");
    }

    @Test
    void deberiaIgnorarMayusculasYAcentos() {
        ResultadoClasificacion resultado = service.clasificar("CAFÉ en una panadería");

        assertThat(resultado.categoria()).isEqualTo(CategoriaTransaccion.ALIMENTACION);
        assertThat(resultado.puntuacion()).isEqualTo(2);
        assertThat(resultado.coincidencias()).containsExactly("cafe", "panaderia");
    }

    @Test
    void deberiaUsarOtrosCuandoNoHayCoincidencias() {
        ResultadoClasificacion resultado = service.clasificar("Compra sin descripción conocida");

        assertThat(resultado.categoria()).isEqualTo(CategoriaTransaccion.OTROS);
        assertThat(resultado.puntuacion()).isZero();
        assertThat(resultado.confianza()).isEqualTo(0.30);
        assertThat(resultado.coincidencias()).isEmpty();
    }

    @Test
    void noDeberiaAceptarCoincidenciasParciales() {
        ResultadoClasificacion resultado = service.clasificar("Servicio de búsqueda en línea");

        assertThat(resultado.categoria()).isEqualTo(CategoriaTransaccion.OTROS);
        assertThat(resultado.coincidencias()).isEmpty();
    }

    @Test
    void deberiaMantenerLasDoceCategoriasAcordadasConMachineLearning() {
        assertEquals(
                12,
                CategoriaTransaccion.values().length
        );

        assertEquals(
                Set.of(
                        "profesionales",
                        "mascotas",
                        "alimentacion",
                        "transporte",
                        "salud",
                        "educacion",
                        "entretenimiento",
                        "deudas",
                        "impuestos_y_seguros",
                        "cuidado_personal",
                        "vivienda",
                        "otros"
                ),
                Arrays.stream(CategoriaTransaccion.values())
                        .map(CategoriaTransaccion::getCodigo)
                        .collect(Collectors.toSet())
        );
    }

}
