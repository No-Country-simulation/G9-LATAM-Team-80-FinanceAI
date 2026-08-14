package com.financeai.service;

import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.persistence.entity.TransaccionEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.TransaccionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class TransaccionPersistenciaService {
    private final TransaccionRepository repositorio;
    public TransaccionPersistenciaService(TransaccionRepository repositorio) { this.repositorio = repositorio; }

    public List<TransaccionResponse> listar(Usuario usuario) {
        return repositorio.findByUsuarioIdOrderByFechaDescIdDesc(usuario.getId()).stream().map(this::respuesta).toList();
    }
    @Transactional
    public TransaccionResponse crear(Usuario usuario, TransaccionGuardarRequest request) {
        return respuesta(repositorio.save(nueva(usuario, request)));
    }
    @Transactional
    public List<TransaccionResponse> importar(Usuario usuario, ImportarTransaccionesRequest request) {
        return repositorio.saveAll(request.transacciones().stream().map(item -> nueva(usuario, item)).toList()).stream().map(this::respuesta).toList();
    }
    @Transactional
    public TransaccionResponse actualizar(Usuario usuario, Long id, TransaccionGuardarRequest request) {
        TransaccionEntity item = obtener(usuario, id);
        item.actualizar(request.descripcion(), request.categoria(), request.tipo(), request.fecha(), request.monto());
        return respuesta(item);
    }
    @Transactional
    public void eliminar(Usuario usuario, Long id) { repositorio.delete(obtener(usuario, id)); }

    private TransaccionEntity obtener(Usuario usuario, Long id) {
        return repositorio.findByIdAndUsuarioId(id, usuario.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaccion no encontrada"));
    }
    private TransaccionEntity nueva(Usuario usuario, TransaccionGuardarRequest request) {
        return new TransaccionEntity(usuario, request.descripcion().trim(), request.categoria(), request.tipo(), request.fecha(), request.monto().abs());
    }
    private TransaccionResponse respuesta(TransaccionEntity item) {
        return new TransaccionResponse(item.getId(), item.getDescripcion(), item.getCategoria(), item.getTipo(), item.getFecha(), item.getMonto());
    }
}

