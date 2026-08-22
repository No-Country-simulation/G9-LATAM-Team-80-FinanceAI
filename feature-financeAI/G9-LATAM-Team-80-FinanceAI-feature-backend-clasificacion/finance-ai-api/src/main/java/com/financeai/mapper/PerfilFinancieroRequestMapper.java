package com.financeai.mapper;

import com.financeai.domain.ResumenFinanciero;
import com.financeai.dto.perfil.PerfilFinancieroRequest;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class PerfilFinancieroRequestMapper {

    public PerfilFinancieroRequest toRequest(
            ResumenFinanciero resumen
    ) {
        Objects.requireNonNull(
                resumen,
                "El resumen financiero es obligatorio"
        );

        return new PerfilFinancieroRequest(
                resumen.ingresoMensual(),
                resumen.gastoTotalMes(),
                resumen.nivelEndeudamiento()
        );
    }
}
