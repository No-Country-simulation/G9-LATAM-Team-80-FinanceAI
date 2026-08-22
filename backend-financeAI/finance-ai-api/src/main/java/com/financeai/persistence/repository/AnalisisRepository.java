package com.financeai.persistence.repository;

import com.financeai.persistence.entity.AnalisisEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalisisRepository extends JpaRepository<AnalisisEntity, Long> {
    List<AnalisisEntity> findByUsuarioIdOrderByCreadoEnDesc(Long usuarioId);
    Optional<AnalisisEntity> findByIdAndUsuarioId(Long id, Long usuarioId);
}

