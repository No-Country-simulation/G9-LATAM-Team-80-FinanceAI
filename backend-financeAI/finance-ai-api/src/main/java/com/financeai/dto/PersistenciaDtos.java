package com.financeai.dto;

import com.financeai.dominio.CategoriasFinancieras;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class PersistenciaDtos {
    private PersistenciaDtos() {}
    public record TransaccionGuardarRequest(
            @NotBlank @Size(max = 200) String descripcion,
            @Size(max = 50) String categoria,
            @NotBlank @Pattern(regexp = "ingreso|gasto|ahorro") String tipo,
            @NotNull @PastOrPresent LocalDate fecha,
            @NotNull @DecimalMin("0.01") BigDecimal monto
    ) {
        /**
         * La categoria dejo de ser obligatoria a secas: depende del tipo.
         *
         * Las doce categorias del catalogo son categorias de GASTO, asi que exigirlas
         * en un ingreso obligaba a inventar un valor -- se venia usando "otros" -- que
         * luego se mostraba en pantalla como si significara algo.
         */
        @AssertTrue(message = "La categoria es obligatoria en los gastos y no corresponde en ingresos ni ahorros")
        public boolean isCategoriaCoherenteConElTipo() {
            boolean tieneCategoria = categoria != null && !categoria.isBlank();
            return "gasto".equals(tipo) == tieneCategoria;
        }

        /**
         * Y ademas tiene que ser una de las doce.
         *
         * La regla de arriba solo miraba si habia algo escrito, asi que un gasto con
         * categoria "banana" se guardaba tal cual y llegaba al tablero como una
         * categoria mas. La comprobacion no vive en el frontend: cualquiera que hable
         * con la API directamente se la salta.
         */
        @AssertTrue(message = "La categoria debe pertenecer al catalogo oficial")
        public boolean isCategoriaDelCatalogo() {
            return CategoriasFinancieras.esValidaOAusente(categoria);
        }

        /** Cadena vacia y null son lo mismo aqui: en la columna se guarda null. */
        public String categoriaNormalizada() {
            return categoria == null || categoria.isBlank() ? null : categoria;
        }
    }
    public record TransaccionResponse(Long id, String descripcion, String categoria, String tipo, LocalDate fecha, BigDecimal monto) {}
    public record ImportarTransaccionesRequest(@NotEmpty List<@jakarta.validation.Valid TransaccionGuardarRequest> transacciones) {}
    public record PresupuestoRequest(
            @NotBlank @Size(max = 50) String categoria,
            @NotNull @DecimalMin("0.01") BigDecimal presupuesto
    ) {}
    public record PresupuestoResponse(Long id, String categoria, BigDecimal presupuesto, BigDecimal gastado) {}
    public record AnalisisHistorialResponse(
            Long id, LocalDateTime fecha, BigDecimal ingresoMensual, BigDecimal nivelEndeudamiento,
            String frecuenciaAhorro, String perfilFinanciero, BigDecimal probabilidad,
            BigDecimal gastoTotalMes, BigDecimal ahorroTotal
    ) {}
    public record AnalisisDetalleResponse(Long id, LocalDateTime fecha, Map<String, Object> resultado) {}
}

