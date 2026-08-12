package com.financeai.service;

import com.financeai.client.PerfilFinancieroClient;
import com.financeai.domain.ResumenFinanciero;
import com.financeai.dto.analisis.AnalisisFinancieroResponse;
import com.financeai.dto.perfil.PerfilFinancieroRequest;
import com.financeai.dto.perfil.PerfilFinancieroResponse;
import com.financeai.mapper.PerfilFinancieroMapper;
import com.financeai.mapper.PerfilFinancieroRequestMapper;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class AnalisisFinancieroService {

    private final PerfilFinancieroRequestMapper requestMapper;
    private final PerfilFinancieroClient perfilFinancieroClient;
    private final PerfilFinancieroMapper responseMapper;

    public AnalisisFinancieroService(
            PerfilFinancieroRequestMapper requestMapper,
            PerfilFinancieroClient perfilFinancieroClient,
            PerfilFinancieroMapper responseMapper
    ) {
        this.requestMapper = requestMapper;
        this.perfilFinancieroClient = perfilFinancieroClient;
        this.responseMapper = responseMapper;
    }

    public AnalisisFinancieroResponse analizar(
            ResumenFinanciero resumen
    ) {
        Objects.requireNonNull(
                resumen,
                "El resumen financiero es obligatorio"
        );

        PerfilFinancieroRequest request =
                requestMapper.toRequest(resumen);

        PerfilFinancieroResponse respuestaMl =
                perfilFinancieroClient.analizar(request);

        return responseMapper.toPublicResponse(respuestaMl);
    }
}