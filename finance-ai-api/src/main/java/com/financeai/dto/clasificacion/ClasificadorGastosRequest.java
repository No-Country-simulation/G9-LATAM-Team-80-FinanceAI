package com.financeai.dto.clasificacion;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record ClasificadorGastosRequest(

        @JsonProperty("descripcion")
        @NotBlank(message = "La descripción es obligatoria")
        String descripcion

) {
}
