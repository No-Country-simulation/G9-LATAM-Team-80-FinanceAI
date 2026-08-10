package com.financeai.dto.perfil;

import com.fasterxml.jackson.annotation.JsonProperty;


public record PerfilFinancieroMetricasResponse(

        @JsonProperty("ratio_gasto_ingreso")
        double ratioGastoIngreso,

        @JsonProperty("nivel_endeudamiento")
        double nivelEndeudamiento,

        @JsonProperty("frecuencia_ahorro")
        String frecuenciaAhorro,

        @JsonProperty("ahorro_estimado_pct")
        double ahorroEstimadoPct

) {
}
