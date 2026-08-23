package com.financeai.config;

import com.financeai.persistence.entity.PresupuestoEntity;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.PresupuestoRepository;
import com.financeai.persistence.repository.TransaccionRepository;
import com.financeai.persistence.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Configuration
public class DatosInicialesConfig {
    @Bean
    CommandLineRunner datosIniciales(UsuarioRepository usuarios, TransaccionRepository transacciones, PresupuestoRepository presupuestos) {
        return args -> usuarios.findByEmailIgnoreCase("demo@financeai.local").ifPresent(usuario -> {
            if (transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId()).isEmpty()) guardarTransacciones(usuario, transacciones);
            if (presupuestos.findByUsuarioIdOrderByCategoria(usuario.getId()).isEmpty()) guardarPresupuestos(usuario, presupuestos);
        });
    }

    /**
     * Movimientos de demostracion, en pesos y del mes en curso.
     *
     * Antes eran cifras de tres digitos -- un alquiler de 930 -- que no se parecian a
     * nada real, y los dias salian de hoy.minusDays(N): al levantar una base nueva a
     * primeros de mes, la mitad de los movimientos caia en el mes anterior y el tablero
     * arrancaba con el periodo partido en dos.
     *
     * Ahora cada uno tiene su dia del mes, siempre el mismo, y el conjunto entero cae en
     * el mes que se este mirando. El unico dato que depende del reloj es de que mes se
     * trata, que es justo lo que hace falta para que la demo no aparezca vacia.
     *
     * Las cifras dan un perfil "En riesgo" con margen negativo, que es el caso donde el
     * tablero tiene algo que contar: ingresos 5.000.000, gastos 2.470.000, pagos de
     * deuda 2.500.000 y 100.000 de ahorro.
     */
    private void guardarTransacciones(Usuario usuario, TransaccionRepository repositorio) {
        repositorio.saveAll(List.of(
                movimiento(usuario, "Nomina mensual", null, "ingreso", dia(1), "5000000"),
                movimiento(usuario, "Arriendo apartamento", "vivienda", "gasto", dia(2), "1100000"),
                movimiento(usuario, "Servicios publicos", "vivienda", "gasto", dia(3), "150000"),
                movimiento(usuario, "Mercado del mes", "alimentacion", "gasto", dia(4), "500000"),
                movimiento(usuario, "Copago medicina general", "salud", "gasto", dia(6), "80000"),
                movimiento(usuario, "Pago cuota credito de consumo", "deudas", "gasto", dia(10), "1500000"),
                movimiento(usuario, "Pago tarjeta de credito", "deudas", "gasto", dia(11), "1000000"),
                movimiento(usuario, "Seguro del carro", "impuestos_y_seguros", "gasto", dia(13), "90000"),
                movimiento(usuario, "Cine y comida", "entretenimiento", "gasto", dia(14), "90000"),
                movimiento(usuario, "Peluqueria", "cuidado_personal", "gasto", dia(15), "60000"),
                movimiento(usuario, "Gasolina", "transporte", "gasto", dia(16), "250000"),
                movimiento(usuario, "Regalo cumpleanos", "otros", "gasto", dia(21), "80000"),
                movimiento(usuario, "Transferencia a cuenta de ahorro", null, "ahorro", dia(22), "100000")
        ));
    }

    /** El ultimo dia que usa el conjunto de arriba. */
    private static final int ULTIMO_DIA_SEMBRADO = 22;

    /**
     * El dia indicado, en el mes mas reciente donde quepa entero.
     *
     * Recortar los dias a hoy -- que fue el primer intento -- amontonaba la demo: con la
     * base levantada el dia 2, doce de los trece movimientos caian en esa misma fecha y
     * el tablero mostraba una linea de evolucion de un solo punto y una lista con todo
     * el mismo dia. Levantada el dia 10 seguian juntandose ocho.
     *
     * Asi que cuando el mes en curso todavia no da de si, se siembra el anterior, donde
     * los veintidos dias existen y ya pasaron. El conjunto sale siempre igual: trece
     * fechas distintas, ninguna futura. El selector de periodo abre en el mes mas
     * reciente CON datos, de modo que la demo nunca arranca vacia.
     */
    private LocalDate dia(int diaDelMes) {
        LocalDate hoy = LocalDate.now();
        LocalDate mes = hoy.getDayOfMonth() >= ULTIMO_DIA_SEMBRADO ? hoy : hoy.minusMonths(1);
        return mes.withDayOfMonth(diaDelMes);
    }

    private void guardarPresupuestos(Usuario usuario, PresupuestoRepository repositorio) {
        repositorio.saveAll(List.of(
                new PresupuestoEntity(usuario, "alimentacion", new BigDecimal("600000")),
                new PresupuestoEntity(usuario, "transporte", new BigDecimal("300000")),
                new PresupuestoEntity(usuario, "vivienda", new BigDecimal("1300000")),
                new PresupuestoEntity(usuario, "entretenimiento", new BigDecimal("150000"))
        ));
    }
    private TransaccionEntity movimiento(Usuario usuario, String descripcion, String categoria, String tipo, LocalDate fecha, String monto) {
        return new TransaccionEntity(usuario, descripcion, categoria, tipo, fecha, new BigDecimal(monto));
    }
}
