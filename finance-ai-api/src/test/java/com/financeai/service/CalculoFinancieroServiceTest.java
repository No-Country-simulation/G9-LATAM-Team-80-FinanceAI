package com.financeai.service;

import com.financeai.domain.TipoTransaccion;
import com.financeai.dto.TransaccionRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CalculoFinancieroServiceTest {

    private final CalculoFinancieroService service =
            new CalculoFinancieroService();

    @Test
    void deberiaCalcularLosGastosDelMesConPrecisionDecimal() {
        List<TransaccionRequest> transacciones = List.of(
                new TransaccionRequest(
                        "Compra en supermercado",
                        new BigDecimal("100.50"),
                        LocalDate.of(2026, 7, 5),
                        TipoTransaccion.GASTO
                ),
                new TransaccionRequest(
                        "Viaje en taxi",
                        new BigDecimal("45.25"),
                        LocalDate.of(2026, 7, 18),
                        TipoTransaccion.GASTO
                )
        );

        BigDecimal resultado = service.calcularGastoTotalMes(
                transacciones,
                YearMonth.of(2026, 7)
        );

        assertEquals(
                new BigDecimal("145.75"),
                resultado
        );
    }

    @Test
    void deberiaIgnorarOtrosTiposYOtrosPeriodos() {
        List<TransaccionRequest> transacciones = List.of(
                new TransaccionRequest(
                        "Compra del mes",
                        new BigDecimal("20.00"),
                        LocalDate.of(2026, 7, 10),
                        TipoTransaccion.GASTO
                ),
                new TransaccionRequest(
                        "Salario",
                        new BigDecimal("1000.00"),
                        LocalDate.of(2026, 7, 15),
                        TipoTransaccion.INGRESO
                ),
                new TransaccionRequest(
                        "Ahorro mensual",
                        new BigDecimal("100.00"),
                        LocalDate.of(2026, 7, 20),
                        TipoTransaccion.AHORRO
                ),
                new TransaccionRequest(
                        "Gasto de otro mes",
                        new BigDecimal("70.00"),
                        LocalDate.of(2026, 8, 1),
                        TipoTransaccion.GASTO
                )
        );

        BigDecimal resultado = service.calcularGastoTotalMes(
                transacciones,
                YearMonth.of(2026, 7)
        );

        assertEquals(
                new BigDecimal("20.00"),
                resultado
        );
    }

    @Test
    void deberiaDevolverCeroCuandoNoHayGastos() {
        BigDecimal resultado = service.calcularGastoTotalMes(
                List.of(),
                YearMonth.of(2026, 7)
        );

        assertEquals(
                BigDecimal.ZERO,
                resultado
        );
    }

    @Test
    void deberiaRechazarArgumentosObligatoriosNulos() {
        assertAll(
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularGastoTotalMes(
                                null,
                                YearMonth.of(2026, 7)
                        )
                ),
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularGastoTotalMes(
                                List.of(),
                                null
                        )
                )
        );
    }

    @Test
    void deberiaCalcularElRatioGastoIngreso() {
        BigDecimal resultado = service.calcularRatioGastoIngreso(
                new BigDecimal("800.00"),
                new BigDecimal("1000.00")
        );

        assertEquals(
                new BigDecimal("0.8000"),
                resultado
        );
    }

    @Test
    void deberiaPermitirUnRatioMayorAUno() {
        BigDecimal resultado = service.calcularRatioGastoIngreso(
                new BigDecimal("1200.00"),
                new BigDecimal("1000.00")
        );

        assertEquals(
                new BigDecimal("1.2000"),
                resultado
        );
    }

    @Test
    void deberiaRedondearElRatioAcuatroDecimales() {
        BigDecimal resultado = service.calcularRatioGastoIngreso(
                BigDecimal.ONE,
                new BigDecimal("3")
        );

        assertEquals(
                new BigDecimal("0.3333"),
                resultado
        );
    }

    @Test
    void deberiaPermitirGastoTotalCero() {
        BigDecimal resultado = service.calcularRatioGastoIngreso(
                BigDecimal.ZERO,
                new BigDecimal("1000.00")
        );

        assertEquals(
                new BigDecimal("0.0000"),
                resultado
        );
    }

    @Test
    void deberiaRechazarValoresFinancierosInvalidos() {
        assertAll(
                () -> assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularRatioGastoIngreso(
                                new BigDecimal("-1.00"),
                                new BigDecimal("1000.00")
                        )
                ),
                () -> assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularRatioGastoIngreso(
                                new BigDecimal("100.00"),
                                BigDecimal.ZERO
                        )
                ),
                () -> assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularRatioGastoIngreso(
                                new BigDecimal("100.00"),
                                new BigDecimal("-1000.00")
                        )
                )
        );
    }

    @Test
    void deberiaRechazarValoresFinancierosNulos() {
        assertAll(
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularRatioGastoIngreso(
                                null,
                                new BigDecimal("1000.00")
                        )
                ),
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularRatioGastoIngreso(
                                new BigDecimal("100.00"),
                                null
                        )
                )
        );
    }
}
