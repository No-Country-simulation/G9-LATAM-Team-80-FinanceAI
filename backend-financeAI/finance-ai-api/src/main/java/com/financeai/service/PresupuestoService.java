package com.financeai.service;

import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.persistence.entity.PresupuestoEntity;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.PresupuestoRepository;
import com.financeai.persistence.repository.TransaccionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@Service
public class PresupuestoService {
    private final PresupuestoRepository presupuestos;
    private final TransaccionRepository transacciones;
    public PresupuestoService(PresupuestoRepository presupuestos, TransaccionRepository transacciones) {
        this.presupuestos = presupuestos; this.transacciones = transacciones;
    }

    public List<PresupuestoResponse> listar(Usuario usuario) {
        List<TransaccionEntity> movimientos = transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId());
        return presupuestos.findByUsuarioIdOrderByCategoria(usuario.getId()).stream()
                .map(item -> respuesta(item, gasto(item.getCategoria(), movimientos))).toList();
    }

    @Transactional
    public PresupuestoResponse guardar(Usuario usuario, PresupuestoRequest request) {
        PresupuestoEntity item = presupuestos.findByUsuarioIdAndCategoria(usuario.getId(), request.categoria())
                .map(existente -> { existente.actualizarMonto(request.presupuesto()); return existente; })
                .orElseGet(() -> new PresupuestoEntity(usuario, request.categoria(), request.presupuesto()));
        item = presupuestos.save(item);
        return respuesta(item, gasto(item.getCategoria(), transacciones.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId())));
    }

    /**
     * Gasto de la categoria en UN mes.
     *
     * Antes sumaba todas las transacciones del usuario sin filtrar por fecha, asi que un
     * presupuesto mensual se comparaba contra el gasto de todo el historial: con tres
     * meses cargados, cualquier limite aparecia excedido.
     *
     * Se usa el mes mas reciente con movimientos, la misma regla que aplica el frontend
     * para el analisis, para que las dos pantallas hablen del mismo periodo.
     */
    private BigDecimal gasto(String categoria, List<TransaccionEntity> items) {
        YearMonth mes = mesMasReciente(items);
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

