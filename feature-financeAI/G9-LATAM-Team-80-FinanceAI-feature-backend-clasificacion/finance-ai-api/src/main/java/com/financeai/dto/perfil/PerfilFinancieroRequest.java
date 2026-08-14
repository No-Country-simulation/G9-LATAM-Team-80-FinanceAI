package com.financeai.dto.perfil;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record PerfilFinancieroRequest(

        @JsonProperty("ingreso_mensual")
        BigDecimal ingresoMensual,

        @JsonProperty("gasto_total_mes")
        BigDecimal gastoTotalMes,

        @JsonProperty("nivel_endeudamiento")
        BigDecimal nivelEndeudamiento

) {
}
