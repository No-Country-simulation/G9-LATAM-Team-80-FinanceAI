package com.financeai.dto.analisis;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.financeai.dto.perfil.PerfilFinancieroMetricasResponse;

import java.util.List;

public record AnalisisFinancieroResponse(

        @JsonProperty("perfil_financiero")
        String perfilFinanciero,

        @JsonProperty("probabilidad")
        double probabilidad,

        @JsonProperty("razones")
        List<String> razones,

        @JsonProperty("metricas")
        PerfilFinancieroMetricasResponse metricas

) {
}
