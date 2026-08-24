package com.financeai.service;

import com.financeai.dto.PersistenciaDtos.PresupuestoResponse;
import com.financeai.persistence.entity.PresupuestoEntity;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.PresupuestoRepository;
import com.financeai.persistence.repository.TransaccionRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * El gasto que se compara contra un presupuesto tiene que ser el de UN mes.
 *
 * Antes se sumaban todas las transacciones del usuario sin filtrar por fecha, asi que un
 * limite mensual se comparaba contra el gasto acumulado de todo el historial: con varios
 * meses cargados, cualquier presupuesto aparecia excedido aunque el mes fuera normal.
 */
class PresupuestoServicePorMesTest {

    private final Usuario usuario = new Usuario("Prueba", "prueba@financeai.local", "hash");

    /** El repositorio responde con el limite de ESE periodo, como en produccion. */
    private PresupuestoService servicioCon(List<TransaccionEntity> movimientos) {
        return servicioCon(movimientos, Map.of("2026-08", "600000"));
    }

    private PresupuestoService servicioCon(List<TransaccionEntity> movimientos, Map<String, String> limitesPorPeriodo) {
        PresupuestoRepository presupuestos = mock(PresupuestoRepository.class);
        TransaccionRepository transacciones = mock(TransaccionRepository.class);
        when(presupuestos.findByUsuarioIdAndPeriodoOrderByCategoria(any(), anyString()))
                .thenAnswer(invocacion -> {
                    String periodo = invocacion.getArgument(1);
                    String monto = limitesPorPeriodo.get(periodo);
                    return monto == null ? List.<PresupuestoEntity>of()
                            : List.of(new PresupuestoEntity(usuario, "alimentacion", periodo, new BigDecimal(monto)));
                });
        when(transacciones.findByUsuarioIdOrderByFechaDescIdDesc(any())).thenReturn(movimientos);
        return new PresupuestoService(presupuestos, transacciones);
    }

    private TransaccionEntity gasto(String categoria, String fecha, String monto) {
        return new TransaccionEntity(usuario, "Mercado", categoria, "gasto", LocalDate.parse(fecha), new BigDecimal(monto));
    }

    @Test
    void soloCuentaElGastoDelMesMasReciente() {
        PresupuestoService servicio = servicioCon(List.of(
                gasto("alimentacion", "2026-06-10", "500000"),
                gasto("alimentacion", "2026-07-10", "450000"),
                gasto("alimentacion", "2026-08-04", "300000"),
                gasto("alimentacion", "2026-08-18", "200000")
        ));

        PresupuestoResponse alimentacion = servicio.listar(usuario, null).get(0);

        // Agosto: 300.000 + 200.000. Los 950.000 de junio y julio no entran.
        assertThat(alimentacion.gastado()).isEqualByComparingTo("500000");
        assertThat(alimentacion.gastado())
                .as("sumar los cuatro meses daria 1.450.000 y el presupuesto de 600.000 se veria excedido")
                .isLessThan(new BigDecimal("600000"));
    }

    @Test
    void ignoraOtrasCategoriasYOtrosTipos() {
        PresupuestoService servicio = servicioCon(List.of(
                gasto("alimentacion", "2026-08-04", "300000"),
                gasto("transporte", "2026-08-05", "900000"),
                new TransaccionEntity(usuario, "Nomina", "otros", "ingreso", LocalDate.parse("2026-08-01"), new BigDecimal("5000000"))
        ));

        assertThat(servicio.listar(usuario, null).get(0).gastado()).isEqualByComparingTo("300000");
    }

    @Test
    void sinMovimientosElGastoEsCero() {
        assertThat(servicioCon(List.of()).listar(usuario, null).get(0).gastado()).isEqualByComparingTo("0");
    }

    /*
     * El limite no tiene periodo, pero el gasto contra el que se compara si. Sin el
     * parametro la pantalla mostraba el consumo del mes mas reciente aunque estuvieras
     * mirando otro, de modo que cambiar de mes en el encabezado no cambiaba nada.
     */

    @Test
    void elMesPedidoManda() {
        PresupuestoService servicio = servicioCon(
                List.of(
                        gasto("alimentacion", "2026-06-10", "500000"),
                        gasto("alimentacion", "2026-07-10", "450000"),
                        gasto("alimentacion", "2026-08-04", "300000")
                ),
                Map.of("2026-06", "600000", "2026-07", "600000", "2026-08", "600000"));

        assertThat(servicio.listar(usuario, "2026-07").get(0).gastado()).isEqualByComparingTo("450000");
        assertThat(servicio.listar(usuario, "2026-06").get(0).gastado()).isEqualByComparingTo("500000");
    }

    @Test
    void distingueElMismoMesDeAniosDistintos() {
        PresupuestoService servicio = servicioCon(
                List.of(gasto("alimentacion", "2025-08-10", "700000"), gasto("alimentacion", "2026-08-10", "300000")),
                Map.of("2025-08", "600000", "2026-08", "600000"));

        assertThat(servicio.listar(usuario, "2025-08").get(0).gastado()).isEqualByComparingTo("700000");
        assertThat(servicio.listar(usuario, "2026-08").get(0).gastado()).isEqualByComparingTo("300000");
    }

    @Test
    void unMesSinPresupuestoNoDevuelveElDeOtroMes() {
        PresupuestoService servicio = servicioCon(List.of(gasto("alimentacion", "2026-08-04", "300000")));

        assertThat(servicio.listar(usuario, "2026-05"))
                .as("mayo no tiene limites propios; los de agosto no deben aparecer aqui")
                .isEmpty();
    }

    /*
     * El limite pertenece a un periodo. Antes la unicidad era (usuario, categoria) y el
     * mismo valor regia para todos los meses: configurar septiembre cambiaba agosto.
     */

    @Test
    void cadaPeriodoTieneSuPropioLimite() {
        PresupuestoService servicio = servicioCon(
                List.of(gasto("alimentacion", "2026-08-04", "300000"), gasto("alimentacion", "2026-09-04", "200000")),
                Map.of("2026-08", "600000", "2026-09", "900000"));

        assertThat(servicio.listar(usuario, "2026-08").get(0).presupuesto()).isEqualByComparingTo("600000");
        assertThat(servicio.listar(usuario, "2026-09").get(0).presupuesto()).isEqualByComparingTo("900000");
    }

    @Test
    void elMismoMesDeDosAniosSonPresupuestosDistintos() {
        PresupuestoService servicio = servicioCon(
                List.of(gasto("alimentacion", "2025-08-10", "700000"), gasto("alimentacion", "2026-08-10", "300000")),
                Map.of("2025-08", "800000", "2026-08", "600000"));

        assertThat(servicio.listar(usuario, "2025-08").get(0).presupuesto()).isEqualByComparingTo("800000");
        assertThat(servicio.listar(usuario, "2026-08").get(0).presupuesto()).isEqualByComparingTo("600000");
    }

    /*
     * Un periodo mal escrito lo rechaza el controlador con 400 antes de llegar aqui: ver
     * PresupuestoController.validar. Devolver los datos de otro mes sin avisar era la
     * peor forma de fallar, porque la pantalla enseñaba cifras validas de un periodo que
     * nadie habia pedido.
     */
}
