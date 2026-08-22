package com.financeai.service;

import com.financeai.classification.CategoriaTransaccion;
import com.financeai.domain.TransaccionClasificada;
import com.financeai.domain.ResumenFinanciero;
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

    @Test
    void deberiaCalcularUnResumenFinancieroMensual() {
        List<TransaccionClasificada> transacciones = List.of(
                new TransaccionClasificada(
                        "Supermercado",
                        new BigDecimal("600.25"),
                        LocalDate.of(2026, 7, 5),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.ALIMENTACION
                ),
                new TransaccionClasificada(
                        "Transporte",
                        new BigDecimal("199.75"),
                        LocalDate.of(2026, 7, 18),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.ALIMENTACION
                ),
                new TransaccionClasificada(
                        "Salario",
                        new BigDecimal("1000.00"),
                        LocalDate.of(2026, 7, 15),
                        TipoTransaccion.INGRESO,
                        CategoriaTransaccion.OTROS
                ),
                new TransaccionClasificada(
                        "Gasto de agosto",
                        new BigDecimal("50.00"),
                        LocalDate.of(2026, 8, 1),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.OTROS
                )
        );

        ResumenFinanciero resultado =
                service.calcularResumenFinanciero(
                        transacciones,
                        new BigDecimal("1000.00"),
                        YearMonth.of(2026, 7)
                );

        assertAll(
                () -> assertEquals(
                        YearMonth.of(2026, 7),
                        resultado.periodo()
                ),
                () -> assertEquals(
                        new BigDecimal("1000.00"),
                        resultado.ingresoMensual()
                ),
                () -> assertEquals(
                        new BigDecimal("800.00"),
                        resultado.gastoTotalMes()
                ),
                () -> assertEquals(
                        new BigDecimal("0.8000"),
                        resultado.ratioGastoIngreso()
                ),
                () -> assertEquals(
                        "USD",
                        resultado.moneda()
                ),
                () -> assertEquals(
                        BigDecimal.ZERO,
                        resultado.totalDeudasMes()
                ),
                () -> assertEquals(
                        new BigDecimal("0.0000"),
                        resultado.nivelEndeudamiento()
                )
        );
    }

    @Test
    void deberiaCalcularUnResumenSinGastos() {
        ResumenFinanciero resultado =
                service.calcularResumenFinanciero(
                        List.of(),
                        new BigDecimal("1000.00"),
                        YearMonth.of(2026, 7)
                );

        assertAll(
                () -> assertEquals(
                        BigDecimal.ZERO,
                        resultado.gastoTotalMes()
                ),
                () -> assertEquals(
                        new BigDecimal("0.0000"),
                        resultado.ratioGastoIngreso()
                ),
                () -> assertEquals(
                        "USD",
                        resultado.moneda()
                )
        );
    }

    @Test
    void deberiaRechazarDatosInvalidosAlCalcularElResumen() {
        assertAll(
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularResumenFinanciero(
                                null,
                                new BigDecimal("1000.00"),
                                YearMonth.of(2026, 7)
                        )
                ),
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularResumenFinanciero(
                                List.of(),
                                new BigDecimal("1000.00"),
                                null
                        )
                ),
                () -> assertThrows(
                        NullPointerException.class,
                        () -> service.calcularResumenFinanciero(
                                List.of(),
                                null,
                                YearMonth.of(2026, 7)
                        )
                ),
                () -> assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularResumenFinanciero(
                                List.of(),
                                BigDecimal.ZERO,
                                YearMonth.of(2026, 7)
                        )
                )
        );
    }
    @Test
    void deberiaCalcularUnicamenteLasDeudasDelPeriodo() {
        List<TransaccionClasificada> transacciones = List.of(
                new TransaccionClasificada(
                        "Pago de tarjeta de crédito",
                        new BigDecimal("200.00"),
                        LocalDate.of(2026, 8, 5),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                ),
                new TransaccionClasificada(
                        "Cuota de préstamo",
                        new BigDecimal("50.00"),
                        LocalDate.of(2026, 8, 10),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                ),
                new TransaccionClasificada(
                        "Compra de supermercado",
                        new BigDecimal("100.00"),
                        LocalDate.of(2026, 8, 12),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.ALIMENTACION
                ),
                new TransaccionClasificada(
                        "Deuda del mes anterior",
                        new BigDecimal("75.00"),
                        LocalDate.of(2026, 7, 25),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                ),
                new TransaccionClasificada(
                        "Reembolso de préstamo",
                        new BigDecimal("30.00"),
                        LocalDate.of(2026, 8, 15),
                        TipoTransaccion.INGRESO,
                        CategoriaTransaccion.DEUDAS
                )
        );

        BigDecimal resultado = service.calcularTotalDeudasMes(
                transacciones,
                YearMonth.of(2026, 8)
        );

        assertEquals(
                new BigDecimal("250.00"),
                resultado
        );
    }
    @Test
    void deberiaDevolverCeroCuandoNoExistanDeudasEnElPeriodo() {
        List<TransaccionClasificada> transacciones = List.of(
                new TransaccionClasificada(
                        "Compra de supermercado",
                        new BigDecimal("80.00"),
                        LocalDate.of(2026, 8, 4),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.ALIMENTACION
                ),
                new TransaccionClasificada(
                        "Pago de préstamo de otro mes",
                        new BigDecimal("120.00"),
                        LocalDate.of(2026, 7, 30),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                )
        );

        BigDecimal resultado = service.calcularTotalDeudasMes(
                transacciones,
                YearMonth.of(2026, 8)
        );

        assertEquals(
                BigDecimal.ZERO,
                resultado
        );
    }
    @Test
    void deberiaCalcularLosGastosDelPeriodoExcluyendoDeudas() {
        List<TransaccionClasificada> transacciones = List.of(
                new TransaccionClasificada(
                        "Compra de supermercado",
                        new BigDecimal("100.00"),
                        LocalDate.of(2026, 8, 5),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.ALIMENTACION
                ),
                new TransaccionClasificada(
                        "Pago de electricidad",
                        new BigDecimal("50.00"),
                        LocalDate.of(2026, 8, 10),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.VIVIENDA
                ),
                new TransaccionClasificada(
                        "Pago de tarjeta de crédito",
                        new BigDecimal("200.00"),
                        LocalDate.of(2026, 8, 15),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                ),
                new TransaccionClasificada(
                        "Transporte del mes anterior",
                        new BigDecimal("40.00"),
                        LocalDate.of(2026, 7, 30),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.TRANSPORTE
                ),
                new TransaccionClasificada(
                        "Salario mensual",
                        new BigDecimal("1000.00"),
                        LocalDate.of(2026, 8, 1),
                        TipoTransaccion.INGRESO,
                        CategoriaTransaccion.OTROS
                )
        );

        BigDecimal resultado =
                service.calcularGastoTotalMesExcluyendoDeudas(
                        transacciones,
                        YearMonth.of(2026, 8)
                );

        assertEquals(
                new BigDecimal("150.00"),
                resultado
        );
    }
    @Test
    void deberiaDevolverCeroCuandoSoloExistanDeudasEnElPeriodo() {
        List<TransaccionClasificada> transacciones = List.of(
                new TransaccionClasificada(
                        "Pago de préstamo",
                        new BigDecimal("300.00"),
                        LocalDate.of(2026, 8, 8),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                ),
                new TransaccionClasificada(
                        "Pago de tarjeta de crédito",
                        new BigDecimal("125.00"),
                        LocalDate.of(2026, 8, 20),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                )
        );

        BigDecimal resultado =
                service.calcularGastoTotalMesExcluyendoDeudas(
                        transacciones,
                        YearMonth.of(2026, 8)
                );

        assertEquals(
                BigDecimal.ZERO,
                resultado
        );
    }
    @Test
    void deberiaCalcularElNivelDeEndeudamientoComoPorcentaje() {
        BigDecimal resultado =
                service.calcularNivelEndeudamiento(
                        new BigDecimal("350.00"),
                        new BigDecimal("1000.00")
                );

        assertEquals(
                new BigDecimal("35.0000"),
                resultado
        );
    }
    @Test
    void deberiaCalcularElNivelDeEndeudamientoConCuatroDecimales() {
        BigDecimal resultado =
                service.calcularNivelEndeudamiento(
                        new BigDecimal("1.00"),
                        new BigDecimal("3.00")
                );

        assertEquals(
                new BigDecimal("33.3333"),
                resultado
        );
    }
    @Test
    void deberiaPermitirUnNivelDeEndeudamientoMayorQueCien() {
        BigDecimal resultado =
                service.calcularNivelEndeudamiento(
                        new BigDecimal("1200.00"),
                        new BigDecimal("1000.00")
                );

        assertEquals(
                new BigDecimal("120.0000"),
                resultado
        );
    }
    @Test
    void deberiaRechazarUnTotalDeDeudasNegativo() {
        IllegalArgumentException excepcion =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularNivelEndeudamiento(
                                new BigDecimal("-10.00"),
                                new BigDecimal("1000.00")
                        )
                );

        assertEquals(
                "El total de deudas del mes no puede ser negativo",
                excepcion.getMessage()
        );
    }
    @Test
    void deberiaRechazarUnIngresoMensualIgualOMenorQueCero() {
        assertAll(
                () -> assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularNivelEndeudamiento(
                                new BigDecimal("100.00"),
                                BigDecimal.ZERO
                        )
                ),
                () -> assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calcularNivelEndeudamiento(
                                new BigDecimal("100.00"),
                                new BigDecimal("-1000.00")
                        )
                )
        );
    }
    @Test
    void deberiaGenerarUnResumenSeparandoGastosYDeudas() {
        List<TransaccionClasificada> transacciones = List.of(
                new TransaccionClasificada(
                        "Gastos de alimentación",
                        new BigDecimal("500.00"),
                        LocalDate.of(2026, 8, 5),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.ALIMENTACION
                ),
                new TransaccionClasificada(
                        "Pago de tarjeta de crédito",
                        new BigDecimal("200.00"),
                        LocalDate.of(2026, 8, 10),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.DEUDAS
                ),
                new TransaccionClasificada(
                        "Gasto de otro mes",
                        new BigDecimal("100.00"),
                        LocalDate.of(2026, 7, 20),
                        TipoTransaccion.GASTO,
                        CategoriaTransaccion.TRANSPORTE
                )
        );

        ResumenFinanciero resultado =
                service.calcularResumenFinanciero(
                        transacciones,
                        new BigDecimal("1000.00"),
                        YearMonth.of(2026, 8)
                );

        assertAll(
                () -> assertEquals(
                        YearMonth.of(2026, 8),
                        resultado.periodo()
                ),
                () -> assertEquals(
                        new BigDecimal("1000.00"),
                        resultado.ingresoMensual()
                ),
                () -> assertEquals(
                        new BigDecimal("500.00"),
                        resultado.gastoTotalMes()
                ),
                () -> assertEquals(
                        new BigDecimal("200.00"),
                        resultado.totalDeudasMes()
                ),
                () -> assertEquals(
                        new BigDecimal("0.5000"),
                        resultado.ratioGastoIngreso()
                ),
                () -> assertEquals(
                        new BigDecimal("20.0000"),
                        resultado.nivelEndeudamiento()
                ),
                () -> assertEquals(
                        "USD",
                        resultado.moneda()
                )
        );
    }
}
