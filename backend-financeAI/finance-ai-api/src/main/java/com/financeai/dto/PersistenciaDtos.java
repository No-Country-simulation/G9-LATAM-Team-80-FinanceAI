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
            @NotBlank(message = "La descripcion es obligatoria") @Size(max = 200, message = "La descripcion no puede superar los 200 caracteres") String descripcion,
            @Size(max = 50) String categoria,
            @NotBlank(message = "El tipo es obligatorio") @Pattern(regexp = "ingreso|gasto|ahorro", message = "El tipo debe ser ingreso, gasto o ahorro") String tipo,
            @NotNull(message = "La fecha es obligatoria") @PastOrPresent(message = "La fecha no puede ser futura") LocalDate fecha,
            @NotNull(message = "El monto es obligatorio") @DecimalMin(value = "0.01", message = "El monto debe ser mayor que cero") BigDecimal monto
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
    /**
     * Un limite de una categoria. El periodo NO viaja aqui: lo pone la peticion (?mes=),
     * porque quien manda es el selector del encabezado y no un campo del formulario.
     *
     * @Digits(13,2) es exactamente el hueco de DECIMAL(15,2) en la tabla: sin el, un
     * limite de mas de trece cifras enteras pasaba la validacion y reventaba al insertar.
     */
    public record PresupuestoRequest(
            @NotBlank @Size(max = 50) String categoria,
            @NotNull @DecimalMin("0.01") @Digits(integer = 13, fraction = 2) BigDecimal presupuesto
    ) {
        @AssertTrue(message = "categoria no pertenece al catalogo oficial")
        public boolean isCategoriaDelCatalogo() {
            return CategoriasFinancieras.OFICIALES.contains(categoria);
        }
    }

    /**
     * Varios limites del MISMO periodo en una sola peticion.
     *
     * Existe para que configurar un mes entero sea una sola transaccion: con una llamada
     * por categoria, un fallo a mitad dejaba el mes configurado a medias y sin forma de
     * saber cuales habian entrado. @Valid en los elementos hace que una sola categoria
     * invalida tumbe la peticion completa antes de tocar la base de datos.
     */
    public record PresupuestoLoteRequest(
            @NotEmpty @Size(max = 50) List<@jakarta.validation.Valid PresupuestoRequest> limites
    ) {}
    public record PresupuestoResponse(Long id, String categoria, BigDecimal presupuesto, BigDecimal gastado) {}
    public record AnalisisHistorialResponse(
            Long id, LocalDateTime fecha, BigDecimal ingresoMensual, BigDecimal nivelEndeudamiento,
            String frecuenciaAhorro, String perfilFinanciero, BigDecimal probabilidad,
            BigDecimal gastoTotalMes, BigDecimal ahorroTotal
    ) {}
    public record AnalisisDetalleResponse(Long id, LocalDateTime fecha, Map<String, Object> resultado) {}
}

