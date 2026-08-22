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

    private void guardarTransacciones(Usuario usuario, TransaccionRepository repositorio) {
        LocalDate hoy = LocalDate.now();
        repositorio.saveAll(List.of(
                movimiento(usuario, "Sueldo mensual", "otros", "ingreso", hoy.minusDays(8), "4500"),
                movimiento(usuario, "Supermercado", "alimentacion", "gasto", hoy.minusDays(7), "420"),
                movimiento(usuario, "Combustible", "transporte", "gasto", hoy.minusDays(6), "300"),
                movimiento(usuario, "Streaming", "entretenimiento", "gasto", hoy.minusDays(5), "40"),
                movimiento(usuario, "Alquiler", "vivienda", "gasto", hoy.minusDays(4), "930"),
                movimiento(usuario, "Transferencia a ahorro", "otros", "ahorro", hoy.minusDays(3), "300")
        ));
    }
    private void guardarPresupuestos(Usuario usuario, PresupuestoRepository repositorio) {
        repositorio.saveAll(List.of(
                new PresupuestoEntity(usuario, "alimentacion", new BigDecimal("1000")),
                new PresupuestoEntity(usuario, "transporte", new BigDecimal("600")),
                new PresupuestoEntity(usuario, "vivienda", new BigDecimal("1500")),
                new PresupuestoEntity(usuario, "entretenimiento", new BigDecimal("300"))
        ));
    }
    private TransaccionEntity movimiento(Usuario usuario, String descripcion, String categoria, String tipo, LocalDate fecha, String monto) {
        return new TransaccionEntity(usuario, descripcion, categoria, tipo, fecha, new BigDecimal(monto));
    }
}
