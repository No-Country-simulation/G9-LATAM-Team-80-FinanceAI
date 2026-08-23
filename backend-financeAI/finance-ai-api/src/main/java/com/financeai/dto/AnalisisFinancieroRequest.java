package com.financeai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.financeai.dominio.CategoriasFinancieras;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.util.List;

public record AnalisisFinancieroRequest(
        @JsonProperty("ingreso_mensual")
        @NotNull(message = "El ingreso mensual es obligatorio")
        @DecimalMin(value = "0.01", message = "El ingreso mensual debe ser mayor que cero")
        BigDecimal ingresoMensual,

        @JsonProperty("nivel_endeudamiento")
        @NotNull(message = "El nivel de endeudamiento es obligatorio")
        @DecimalMin(value = "0", message = "El endeudamiento no puede ser negativo")
        @DecimalMax(value = "100", message = "El endeudamiento no puede superar 100")
        BigDecimal nivelEndeudamiento,

        @JsonProperty("frecuencia_ahorro")
        @NotBlank(message = "La frecuencia de ahorro es obligatoria")
        @Pattern(regexp = "Baja|Media|Alta", message = "La frecuencia debe ser Baja, Media o Alta")
        String frecuenciaAhorro,

        @NotEmpty(message = "Debe incluir al menos una transaccion")
        List<@Valid TransaccionAnalisisRequest> transacciones
) {
    public record TransaccionAnalisisRequest(
            @NotBlank(message = "La descripcion es obligatoria")
            String descripcion,

            @NotNull(message = "El valor es obligatorio")
            @DecimalMin(value = "0.01", message = "El valor debe ser mayor que cero")
            BigDecimal valor,

            @NotBlank(message = "El tipo es obligatorio")
            @Pattern(regexp = "ingreso|gasto|ahorro", message = "El tipo debe ser ingreso, gasto o ahorro")
            String tipo,

            /**
             * Categoria ya confirmada y guardada, cuando el movimiento viene de la base.
             *
             * Va aqui para que llegue hasta el servicio de analisis: sin este campo el
             * record la descartaba al deserializar y el clasificador volvia a decidir,
             * pisando la correccion que la persona ya habia hecho.
             *
             * Opcional a proposito: hay llamadas que no la mandan y para esas el modelo
             * sigue clasificando.
             */
            String categoria
    ) {
        /** Una categoria inventada contaminaria el resumen por categorias del analisis. */
        @AssertTrue(message = "La categoria debe pertenecer al catalogo oficial")
        public boolean isCategoriaDelCatalogo() {
            return CategoriasFinancieras.esValidaOAusente(categoria);
        }
    }
}

