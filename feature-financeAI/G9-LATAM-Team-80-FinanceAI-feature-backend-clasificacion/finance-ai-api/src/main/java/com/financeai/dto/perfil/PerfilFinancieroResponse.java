package com.financeai.dto.perfil;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record PerfilFinancieroResponse(

        @JsonProperty("perfil_financiero")
        String perfilFinanciero,

        @JsonProperty("probabilidad")
        double probabilidad,

        @JsonProperty("razones")
        List<String> razones,

        @JsonProperty("metricas")
        PerfilFinancieroMetricasResponse metricas,

        @JsonProperty("_inconsistencia_ahorro")
        String inconsistenciaAhorro,

        @JsonProperty("_fuente_prediccion")
        String fuentePrediccion

) {
}
