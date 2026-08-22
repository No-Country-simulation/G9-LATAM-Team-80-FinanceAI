package com.financeai.mapper;

import com.financeai.dto.analisis.AnalisisFinancieroResponse;
import com.financeai.dto.perfil.PerfilFinancieroResponse;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class PerfilFinancieroMapper {

    public AnalisisFinancieroResponse toPublicResponse(
            PerfilFinancieroResponse perfil
    ) {
        Objects.requireNonNull(
                perfil,
                "La respuesta del perfil financiero es obligatoria"
        );

        return new AnalisisFinancieroResponse(
                perfil.perfilFinanciero(),
                perfil.probabilidad(),
                perfil.razones(),
                perfil.metricas()
        );
    }
}
