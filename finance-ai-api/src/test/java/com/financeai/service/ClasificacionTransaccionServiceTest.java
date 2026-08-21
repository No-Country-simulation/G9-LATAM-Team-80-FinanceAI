package com.financeai.service;

import com.financeai.classification.CategoriaTransaccion;
import com.financeai.classification.ResultadoClasificacion;
import com.financeai.client.ClasificadorGastosClient;
import com.financeai.dto.clasificacion.ClasificadorGastosRequest;
import com.financeai.dto.clasificacion.ClasificadorGastosResponse;
import com.financeai.mapper.CategoriaTransaccionMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClasificacionTransaccionServiceTest {

    @Mock
    private ClasificadorGastosClient clasificadorGastosClient;

    @Mock
    private CategoriaTransaccionMapper categoriaMapper;

    @InjectMocks
    private ClasificacionTransaccionService service;

    @Test
    void deberiaClasificarLaTransaccionUtilizandoElServicioDeMachineLearning() {
        ClasificadorGastosRequest requestEsperado =
                new ClasificadorGastosRequest("Uber al trabajo");

        ClasificadorGastosResponse respuestaML =
                new ClasificadorGastosResponse(
                        "transporte",
                        0.98
                );

        when(clasificadorGastosClient.clasificar(requestEsperado))
                .thenReturn(respuestaML);

        when(categoriaMapper.desdeCodigo("transporte"))
                .thenReturn(CategoriaTransaccion.TRANSPORTE);

        ResultadoClasificacion resultado =
                service.clasificar("  Uber al trabajo  ");

        assertAll(
                () -> assertThat(resultado.categoria())
                        .isEqualTo(CategoriaTransaccion.TRANSPORTE),

                () -> assertThat(resultado.confianza())
                        .isEqualTo(0.98),

                () -> assertThat(resultado.puntuacion())
                        .isZero(),

                () -> assertThat(resultado.coincidencias())
                        .isEmpty()
        );

        verify(clasificadorGastosClient)
                .clasificar(requestEsperado);

        verify(categoriaMapper)
                .desdeCodigo("transporte");
    }

    @Test
    void deberiaRechazarUnaDescripcionNulaOVaciaSinInvocarMachineLearning() {
        assertAll(
                () -> assertThatIllegalArgumentException()
                        .isThrownBy(() -> service.clasificar(null))
                        .withMessage(
                                "La descripción de la transacción es obligatoria"
                        ),

                () -> assertThatIllegalArgumentException()
                        .isThrownBy(() -> service.clasificar("   "))
                        .withMessage(
                                "La descripción de la transacción es obligatoria"
                        )
        );

        verifyNoInteractions(
                clasificadorGastosClient,
                categoriaMapper
        );
    }
}