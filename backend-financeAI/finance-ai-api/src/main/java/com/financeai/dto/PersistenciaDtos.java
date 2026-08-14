package com.financeai.dto;

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
            @NotBlank @Size(max = 50) String categoria,
            @NotBlank @Pattern(regexp = "ingreso|gasto|ahorro") String tipo,
            @NotNull LocalDate fecha,
            @NotNull @DecimalMin("0.01") BigDecimal monto
    ) {}
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

