package com.financeai.service;

import com.financeai.client.PerfilFinancieroClient;
import com.financeai.domain.ResumenFinanciero;
import com.financeai.dto.analisis.AnalisisFinancieroResponse;
import com.financeai.dto.perfil.PerfilFinancieroRequest;
import com.financeai.dto.perfil.PerfilFinancieroResponse;
import com.financeai.mapper.PerfilFinancieroMapper;
import com.financeai.mapper.PerfilFinancieroRequestMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalisisFinancieroServiceTest {

    @Mock
    private PerfilFinancieroRequestMapper requestMapper;

    @Mock
    private PerfilFinancieroClient perfilFinancieroClient;

    @Mock
    private PerfilFinancieroMapper responseMapper;

    @InjectMocks
    private AnalisisFinancieroService service;

    @Test
    void deberiaOrquestarElAnalisisFinanciero() {
        ResumenFinanciero resumen =
                org.mockito.Mockito.mock(ResumenFinanciero.class);

        PerfilFinancieroRequest request =
                org.mockito.Mockito.mock(PerfilFinancieroRequest.class);

        PerfilFinancieroResponse respuestaMl =
                org.mockito.Mockito.mock(PerfilFinancieroResponse.class);

        AnalisisFinancieroResponse respuestaPublica =
                org.mockito.Mockito.mock(AnalisisFinancieroResponse.class);

        when(requestMapper.toRequest(resumen))
                .thenReturn(request);

        when(perfilFinancieroClient.analizar(request))
                .thenReturn(respuestaMl);

        when(responseMapper.toPublicResponse(respuestaMl))
                .thenReturn(respuestaPublica);

        AnalisisFinancieroResponse resultado =
                service.analizar(resumen);

        assertThat(resultado)
                .isSameAs(respuestaPublica);

        verify(requestMapper).toRequest(resumen);
        verify(perfilFinancieroClient).analizar(request);
        verify(responseMapper).toPublicResponse(respuestaMl);
    }

    @Test
    void deberiaRechazarUnResumenFinancieroNulo() {
        assertThatThrownBy(() -> service.analizar(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("El resumen financiero es obligatorio");

        verifyNoInteractions(
                requestMapper,
                perfilFinancieroClient,
                responseMapper
        );
    }
}