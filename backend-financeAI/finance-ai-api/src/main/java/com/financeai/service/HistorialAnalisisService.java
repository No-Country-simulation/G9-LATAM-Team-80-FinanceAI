package com.financeai.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.financeai.dto.AnalisisFinancieroRequest;
import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.persistence.entity.AnalisisEntity;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.AnalisisRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class HistorialAnalisisService {
    private final AnalisisRepository repositorio;
    private final ObjectMapper objectMapper;
    public HistorialAnalisisService(AnalisisRepository repositorio, ObjectMapper objectMapper) {
        this.repositorio = repositorio; this.objectMapper = objectMapper;
    }

    @Transactional
    public void guardar(Usuario usuario, AnalisisFinancieroRequest request, Map<String, Object> resultado) {
        repositorio.save(new AnalisisEntity(usuario, request.ingresoMensual(), request.nivelEndeudamiento(), request.frecuenciaAhorro(),
                String.valueOf(resultado.get("perfil_financiero")), numero(resultado.get("probabilidad")),
                numero(resultado.get("gasto_total_mes")), numero(resultado.get("ahorro_total")), escribir(resultado)));
    }
    public List<AnalisisHistorialResponse> listar(Usuario usuario) {
        return repositorio.findByUsuarioIdOrderByCreadoEnDesc(usuario.getId()).stream().map(this::resumen).toList();
    }
    public AnalisisDetalleResponse detalle(Usuario usuario, Long id) {
        AnalisisEntity item = obtener(usuario, id);
        return new AnalisisDetalleResponse(item.getId(), item.getCreadoEn(), leer(item.getResultadoJson()));
    }
    @Transactional
    public void eliminar(Usuario usuario, Long id) { repositorio.delete(obtener(usuario, id)); }

    private AnalisisEntity obtener(Usuario usuario, Long id) {
        return repositorio.findByIdAndUsuarioId(id, usuario.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Analisis no encontrado"));
    }
    private AnalisisHistorialResponse resumen(AnalisisEntity item) {
        return new AnalisisHistorialResponse(item.getId(), item.getCreadoEn(), item.getIngresoMensual(), item.getNivelEndeudamiento(),
                item.getFrecuenciaAhorro(), item.getPerfilFinanciero(), item.getProbabilidad(), item.getGastoTotalMes(), item.getAhorroTotal());
    }
    private BigDecimal numero(Object value) { return new BigDecimal(String.valueOf(value)); }
    private String escribir(Map<String, Object> value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception error) { throw new IllegalStateException("No fue posible guardar el analisis", error); }
    }
    private Map<String, Object> leer(String value) {
        try { return objectMapper.readValue(value, new TypeReference<>() {}); }
        catch (Exception error) { throw new IllegalStateException("No fue posible leer el analisis", error); }
    }
}
