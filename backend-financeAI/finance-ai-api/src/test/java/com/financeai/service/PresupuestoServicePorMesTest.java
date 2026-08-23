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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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

    private PresupuestoService servicioCon(List<TransaccionEntity> movimientos) {
        PresupuestoRepository presupuestos = mock(PresupuestoRepository.class);
        TransaccionRepository transacciones = mock(TransaccionRepository.class);
        when(presupuestos.findByUsuarioIdOrderByCategoria(any()))
                .thenReturn(List.of(new PresupuestoEntity(usuario, "alimentacion", new BigDecimal("600000"))));
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

        PresupuestoResponse alimentacion = servicio.listar(usuario).get(0);

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

        assertThat(servicio.listar(usuario).get(0).gastado()).isEqualByComparingTo("300000");
    }

    @Test
    void sinMovimientosElGastoEsCero() {
        assertThat(servicioCon(List.of()).listar(usuario).get(0).gastado()).isEqualByComparingTo("0");
    }
}
