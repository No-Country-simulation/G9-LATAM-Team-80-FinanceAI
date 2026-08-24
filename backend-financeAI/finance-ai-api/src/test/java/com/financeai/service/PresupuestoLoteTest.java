package com.financeai.service;

import com.financeai.dto.PersistenciaDtos.PresupuestoRequest;
import com.financeai.dto.PersistenciaDtos.PresupuestoResponse;
import com.financeai.persistence.entity.PresupuestoEntity;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.PresupuestoRepository;
import com.financeai.persistence.repository.TransaccionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Un limite pertenece a (usuario, categoria, periodo).
 *
 * Configurar septiembre no puede tocar agosto, y agosto de 2026 no puede tocar agosto de
 * 2025. Antes la unicidad era (usuario, categoria) y el limite regia para siempre: la
 * pantalla decia "presupuesto de agosto" y editaba el de todos los meses a la vez.
 *
 * El almacen es un mapa con la misma clave que la tabla, asi que si el servicio se
 * olvidara del periodo en cualquier consulta, dos meses distintos colisionarian aqui
 * igual que colisionarian en MySQL.
 */
class PresupuestoLoteTest {

    private final Usuario usuario = new Usuario("Prueba", "prueba@financeai.local", "hash");
    private final Map<String, PresupuestoEntity> almacen = new LinkedHashMap<>();

    private static String clave(String categoria, String periodo) {
        return categoria + "|" + periodo;
    }

    private PresupuestoService servicio(List<TransaccionEntity> movimientos) {
        PresupuestoRepository presupuestos = mock(PresupuestoRepository.class);
        TransaccionRepository transacciones = mock(TransaccionRepository.class);

        when(presupuestos.findByUsuarioIdAndCategoriaAndPeriodo(any(), anyString(), anyString()))
                .thenAnswer(llamada -> Optional.ofNullable(
                        almacen.get(clave(llamada.getArgument(1), llamada.getArgument(2)))));

        when(presupuestos.findByUsuarioIdAndPeriodoOrderByCategoria(any(), anyString()))
                .thenAnswer(llamada -> almacen.values().stream()
                        .filter(item -> item.getPeriodo().equals(llamada.<String>getArgument(1)))
                        .sorted((a, b) -> a.getCategoria().compareTo(b.getCategoria()))
                        .toList());

        when(presupuestos.save(any(PresupuestoEntity.class))).thenAnswer(llamada -> {
            PresupuestoEntity item = llamada.getArgument(0);
            almacen.put(clave(item.getCategoria(), item.getPeriodo()), item);
            return item;
        });

        when(transacciones.findByUsuarioIdOrderByFechaDescIdDesc(any())).thenReturn(movimientos);
        return new PresupuestoService(presupuestos, transacciones);
    }

    private PresupuestoService servicio() {
        return servicio(List.of(new TransaccionEntity(
                usuario, "Mercado", "alimentacion", "gasto", LocalDate.parse("2026-08-04"), new BigDecimal("550000"))));
    }

    private static PresupuestoRequest limite(String categoria, String monto) {
        return new PresupuestoRequest(categoria, new BigDecimal(monto));
    }

    private BigDecimal montoDe(String categoria, String periodo) {
        PresupuestoEntity item = almacen.get(clave(categoria, periodo));
        return item == null ? null : item.getMonto();
    }

    @Test
    void guardaVariasCategoriasDeUnaVezEnElPeriodoPedido() {
        List<PresupuestoResponse> guardados = servicio().guardarLote(usuario, List.of(
                limite("vivienda", "1300000"),
                limite("alimentacion", "600000"),
                limite("transporte", "300000")
        ), "2026-08");

        assertThat(guardados).hasSize(3);
        assertThat(almacen.keySet())
                .containsExactlyInAnyOrder("vivienda|2026-08", "alimentacion|2026-08", "transporte|2026-08");
    }

    @Test
    void configurarSeptiembreNoTocaAgosto() {
        PresupuestoService servicio = servicio();
        servicio.guardarLote(usuario, List.of(limite("vivienda", "1300000")), "2026-08");
        servicio.guardarLote(usuario, List.of(limite("vivienda", "1100000")), "2026-09");

        assertThat(montoDe("vivienda", "2026-08")).isEqualByComparingTo("1300000");
        assertThat(montoDe("vivienda", "2026-09")).isEqualByComparingTo("1100000");
    }

    @Test
    void editarUnPeriodoNoTocaElMismoMesDeOtroAnio() {
        PresupuestoService servicio = servicio();
        servicio.guardarLote(usuario, List.of(limite("alimentacion", "400000")), "2025-08");
        servicio.guardarLote(usuario, List.of(limite("alimentacion", "600000")), "2026-08");
        servicio.guardarLote(usuario, List.of(limite("alimentacion", "650000")), "2026-08");

        assertThat(montoDe("alimentacion", "2025-08")).isEqualByComparingTo("400000");
        assertThat(montoDe("alimentacion", "2026-08")).isEqualByComparingTo("650000");
    }

    @Test
    void editarUnaCategoriaNoCreaLimiteParaLasDemas() {
        PresupuestoService servicio = servicio();
        servicio.guardarLote(usuario, List.of(limite("vivienda", "1300000")), "2026-08");
        servicio.guardarLote(usuario, List.of(limite("vivienda", "1250000")), "2026-08");

        assertThat(almacen).hasSize(1);
        assertThat(montoDe("salud", "2026-08")).isNull();
    }

    /**
     * Dos limites para la misma categoria en la misma peticion no tienen respuesta
     * correcta: el ultimo ganaria en silencio. Se rechaza el lote entero.
     */
    @Test
    void rechazaLaMismaCategoriaDosVecesEnElMismoLote() {
        assertThatThrownBy(() -> servicio().guardarLote(usuario, List.of(
                limite("vivienda", "1300000"),
                limite("vivienda", "900000")
        ), "2026-08"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("vivienda");

        assertThat(almacen).isEmpty();
    }

    @Test
    void listarDevuelveSoloLosLimitesDelPeriodoConsultado() {
        PresupuestoService servicio = servicio();
        servicio.guardarLote(usuario, List.of(limite("vivienda", "1300000"), limite("alimentacion", "600000")), "2026-08");
        servicio.guardarLote(usuario, List.of(limite("transporte", "280000")), "2026-09");

        assertThat(servicio.listar(usuario, "2026-08").stream().map(PresupuestoResponse::categoria))
                .containsExactly("alimentacion", "vivienda");
        assertThat(servicio.listar(usuario, "2026-09").stream().map(PresupuestoResponse::categoria))
                .containsExactly("transporte");
    }

    /** El gasto que acompaña al limite tiene que ser el del mismo periodo, no el de otro. */
    @Test
    void elGastoQueAcompanaAlLimiteEsElDelMismoPeriodo() {
        PresupuestoService servicio = servicio(List.of(
                new TransaccionEntity(usuario, "Mercado", "alimentacion", "gasto", LocalDate.parse("2026-08-04"), new BigDecimal("550000")),
                new TransaccionEntity(usuario, "Mercado", "alimentacion", "gasto", LocalDate.parse("2026-09-04"), new BigDecimal("120000"))
        ));
        servicio.guardarLote(usuario, List.of(limite("alimentacion", "600000")), "2026-08");
        servicio.guardarLote(usuario, List.of(limite("alimentacion", "650000")), "2026-09");

        assertThat(servicio.listar(usuario, "2026-08").get(0).gastado()).isEqualByComparingTo("550000");
        assertThat(servicio.listar(usuario, "2026-09").get(0).gastado()).isEqualByComparingTo("120000");
    }
}
