package com.financeai.dto.clasificacion;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ClasificadorGastosResponse(

        @JsonProperty("categoria")
        String categoria,

        @JsonProperty("confianza")
        double confianza

) {
}
