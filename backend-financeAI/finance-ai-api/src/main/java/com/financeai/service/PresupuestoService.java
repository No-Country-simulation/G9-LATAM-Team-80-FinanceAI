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

    private BigDecimal gasto(String categoria, List<TransaccionEntity> items) {
        return items.stream().filter(item -> "gasto".equals(item.getTipo()) && categoria.equals(item.getCategoria()))
                .map(TransaccionEntity::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    private PresupuestoResponse respuesta(PresupuestoEntity item, BigDecimal gasto) {
        return new PresupuestoResponse(item.getId(), item.getCategoria(), item.getMonto(), gasto);
    }
}

