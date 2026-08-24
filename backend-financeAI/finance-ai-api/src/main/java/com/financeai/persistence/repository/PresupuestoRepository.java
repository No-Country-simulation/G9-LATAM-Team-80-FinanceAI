package com.financeai.persistence.repository;

import com.financeai.persistence.entity.PresupuestoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PresupuestoRepository extends JpaRepository<PresupuestoEntity, Long> {
    List<PresupuestoEntity> findByUsuarioIdAndPeriodoOrderByCategoria(Long usuarioId, String periodo);
    Optional<PresupuestoEntity> findByUsuarioIdAndCategoriaAndPeriodo(Long usuarioId, String categoria, String periodo);
}

