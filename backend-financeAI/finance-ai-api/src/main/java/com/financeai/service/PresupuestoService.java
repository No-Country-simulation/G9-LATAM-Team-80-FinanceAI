package com.financeai.service;

import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.persistence.entity.PresupuestoEntity;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.PresupuestoRepository;
import com.financeai.persistence.repository.TransaccionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PresupuestoService {
    private final PresupuestoRepository presupuestos;
    private final TransaccionRepository transacciones;
    public PresupuestoService(PresupuestoRepository presupuestos, TransaccionRepository transacciones) {
        this.presupuestos = presupuestos; this.transacciones = transacciones;
    }

    /**
     * Los limites de UN periodo, con lo consumido en ese mismo periodo.
     *
     * El periodo identifica que presupuesto se pide, no solo contra que gasto se compara:
     * agosto de 2026 y septiembre de 2026 son planes distintos y pueden tener limites
     * distintos. Sin periodo se usa el mes mas reciente con movimientos, que es lo que
     * la pantalla muestra al entrar.
     */
    public List<PresupuestoResponse> listar(Usuario usuario, String mes) {
        List<TransaccionEntity> movimientos = transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId());
        YearMonth periodo = periodo(mes, movimientos);
        return presupuestos.findByUsuarioIdAndPeriodoOrderByCategoria(usuario.getId(), periodo.toString()).stream()
                .map(item -> respuesta(item, gasto(item.getCategoria(), movimientos, periodo))).toList();
    }

    /**
     * Crea o actualiza el limite de una categoria EN ESE periodo.
     *
     * Configurar septiembre no toca agosto: la clave es (usuario, categoria, periodo).
     */
    @Transactional
    public PresupuestoResponse guardar(Usuario usuario, PresupuestoRequest request, String mes) {
        List<TransaccionEntity> movimientos = transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId());
        YearMonth periodo = periodo(mes, movimientos);
        return aplicar(usuario, request, periodo, movimientos);
    }

    /**
     * Varios limites del mismo periodo, todo o nada.
     *
     * Configurar un mes es una sola decision, asi que es una sola transaccion: si una
     * categoria falla, no queda el mes escrito a medias. Con una llamada por categoria
     * desde el navegador, un fallo en la sexta dejaba cinco limites guardados y ninguna
     * forma de saber cuales.
     */
    @Transactional
    public List<PresupuestoResponse> guardarLote(Usuario usuario, List<PresupuestoRequest> peticiones, String mes) {
        Set<String> repetidas = new HashSet<>();
        for (PresupuestoRequest peticion : peticiones) {
            if (!repetidas.add(peticion.categoria())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La categoria '" + peticion.categoria() + "' viene dos veces en la misma peticion.");
            }
        }

        List<TransaccionEntity> movimientos = transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId());
        YearMonth periodo = periodo(mes, movimientos);
        return peticiones.stream().map(peticion -> aplicar(usuario, peticion, periodo, movimientos)).toList();
    }

    /** Crea o actualiza una fila. La clave es (usuario, categoria, periodo). */
    private PresupuestoResponse aplicar(Usuario usuario, PresupuestoRequest request,
                                        YearMonth periodo, List<TransaccionEntity> movimientos) {
        String clave = periodo.toString();
        PresupuestoEntity item = presupuestos
                .findByUsuarioIdAndCategoriaAndPeriodo(usuario.getId(), request.categoria(), clave)
                .map(existente -> { existente.actualizarMonto(request.presupuesto()); return existente; })
                .orElseGet(() -> new PresupuestoEntity(usuario, request.categoria(), clave, request.presupuesto()));

        item = presupuestos.save(item);
        return respuesta(item, gasto(item.getCategoria(), movimientos, periodo));
    }

    /**
     * El periodo de la peticion, ya validado en el controlador.
     *
     * Aqui solo queda el caso de que no venga ninguno: entonces se usa el mes mas
     * reciente con movimientos, que es donde abre la pantalla. Un valor mal formado no
     * llega hasta aqui -- el controlador responde 400 antes -- porque devolver los datos
     * de otro mes sin avisar es peor que fallar.
     */
    private YearMonth periodo(String mes, List<TransaccionEntity> movimientos) {
        if (mes != null && !mes.isBlank()) return YearMonth.parse(mes);
        YearMonth reciente = mesMasReciente(movimientos);
        return reciente != null ? reciente : YearMonth.now();
    }

    /**
     * Gasto de la categoria en UN mes.
     *
     * Antes sumaba todas las transacciones del usuario sin filtrar por fecha, asi que un
     * presupuesto mensual se comparaba contra el gasto de todo el historial: con tres
     * meses cargados, cualquier limite aparecia excedido.
     *
     * La categoria que se compara es la GUARDADA en la transaccion. Aqui no se clasifica
     * nada: lo que decidio la persona es lo que cuenta.
     */
    private BigDecimal gasto(String categoria, List<TransaccionEntity> items, YearMonth mes) {
        return items.stream()
                .filter(item -> "gasto".equals(item.getTipo()) && categoria.equals(item.getCategoria()))
                .filter(item -> mes == null || YearMonth.from(item.getFecha()).equals(mes))
                .map(TransaccionEntity::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private YearMonth mesMasReciente(List<TransaccionEntity> items) {
        return items.stream().map(TransaccionEntity::getFecha)
                .max(Comparator.naturalOrder()).map(YearMonth::from).orElse(null);
    }
    private PresupuestoResponse respuesta(PresupuestoEntity item, BigDecimal gasto) {
        return new PresupuestoResponse(item.getId(), item.getCategoria(), item.getMonto(), gasto);
    }
}
