package com.financeai.service;

import com.financeai.client.MlServiceClient;
import com.financeai.dto.AnalisisFinancieroRequest;
import com.financeai.dto.AnalisisFinancieroRequest.TransaccionAnalisisRequest;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.TransaccionRepository;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Arma en una sola llamada el contexto financiero que necesita un agente de chat
 * externo (el widget de Oven en Recomendaciones, ver docs/widget-chat-agentico.md):
 * el mismo JSON enriquecido que ya devuelve /api/analisis-financiero (perfil,
 * metricas, resumen_gastos, clasificaciones, recomendaciones), mas un historial de
 * los meses anteriores con movimientos.
 *
 * No lo usa el frontend de FinanceAI -- ese ya arma este mismo contexto en el
 * navegador (useFinancialWorkspace.ts) porque necesita reaccionar al selector de
 * periodo sin ida y vuelta al servidor. Este servicio existe porque un agente
 * externo no tiene ese estado de frontend: solo puede hacer una llamada HTTP.
 */
@Service
public class AsistenteContextoService {

    private static final String CATEGORIA_DEUDAS = "deudas";
    private static final String TIPO_INGRESO = "ingreso";
    private static final int MESES_DE_HISTORIAL = 3;

    private final TransaccionRepository transacciones;
    private final MlServiceClient mlServiceClient;

    public AsistenteContextoService(TransaccionRepository transacciones, MlServiceClient mlServiceClient) {
        this.transacciones = transacciones;
        this.mlServiceClient = mlServiceClient;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> obtenerContexto(Usuario usuario, YearMonth mesObjetivo) {
        List<TransaccionEntity> todas = transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId());

        Map<String, Object> contexto = analizarPeriodo(todas, mesObjetivo);
        if (contexto == null) {
            return sinMovimientos(mesObjetivo);
        }

        List<Map<String, Object>> historial = new ArrayList<>();
        YearMonth cursor = mesObjetivo.minusMonths(1);
        for (int i = 0; i < MESES_DE_HISTORIAL; i++, cursor = cursor.minusMonths(1)) {
            Map<String, Object> resultado = analizarPeriodo(todas, cursor);
            if (resultado == null) continue;
            Map<String, Object> metricas = (Map<String, Object>) resultado.get("metricas");
            Map<String, Object> entrada = new LinkedHashMap<>();
            entrada.put("fecha", cursor.toString());
            entrada.put("perfil_financiero", resultado.get("perfil_financiero"));
            entrada.put("ratio_gasto_ingreso", metricas.get("ratio_gasto_ingreso"));
            entrada.put("nivel_endeudamiento", metricas.get("nivel_endeudamiento"));
            entrada.put("resumen_gastos", resultado.get("resumen_gastos"));
            historial.add(entrada);
        }
        contexto.put("historial", historial);
        return contexto;
    }

    /** Null cuando el periodo no tiene transacciones o no tiene ingreso -- no hay nada que analizar. */
    private Map<String, Object> analizarPeriodo(List<TransaccionEntity> todas, YearMonth mes) {
        List<TransaccionEntity> delMes = todas.stream()
                .filter(t -> YearMonth.from(t.getFecha()).equals(mes))
                .toList();
        if (delMes.isEmpty()) return null;

        BigDecimal ingreso = sumar(delMes, t -> TIPO_INGRESO.equals(t.getTipo()));
        if (ingreso.signum() <= 0) return null;

        BigDecimal deuda = sumar(delMes, t -> CATEGORIA_DEUDAS.equals(t.getCategoria()));
        // Igual que en el frontend (useFinancialWorkspace.ts): el nivel de
        // endeudamiento se limita a 100, el mismo tope que ya usa el formulario
        // manual de Analisis Financiero -- una escala de datos mezclada no debe
        // generar un porcentaje absurdo hacia el agente.
        BigDecimal nivelEndeudamiento = deuda
                .divide(ingreso, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .min(BigDecimal.valueOf(100));

        List<TransaccionAnalisisRequest> items = delMes.stream()
                .map(t -> new TransaccionAnalisisRequest(t.getDescripcion(), t.getMonto(), t.getTipo(), t.getCategoria()))
                .toList();

        // frecuenciaAhorro es obligatorio en el contrato pero no afecta el veredicto
        // (solo alimenta la senal informativa _inconsistencia_ahorro); "Media" es un
        // valor neutro razonable ya que el agente no tiene un valor declarado por la
        // persona en esta conversacion.
        AnalisisFinancieroRequest request = new AnalisisFinancieroRequest(ingreso, nivelEndeudamiento, "Media", items);
        return mlServiceClient.analizar(request);
    }

    private BigDecimal sumar(List<TransaccionEntity> items, Predicate<TransaccionEntity> filtro) {
        return items.stream().filter(filtro).map(TransaccionEntity::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<String, Object> sinMovimientos(YearMonth mes) {
        Map<String, Object> vacio = new LinkedHashMap<>();
        vacio.put("periodo", mes.toString());
        vacio.put("sin_movimientos", true);
        vacio.put("mensaje", "No hay transacciones registradas para este periodo.");
        return vacio;
    }
}
