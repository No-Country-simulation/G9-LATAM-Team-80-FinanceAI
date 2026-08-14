package com.financeai.persistence.repository;

import com.financeai.persistence.entity.TransaccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TransaccionRepository extends JpaRepository<TransaccionEntity, Long> {
    List<TransaccionEntity> findByUsuarioIdOrderByFechaDescIdDesc(Long usuarioId);
    Optional<TransaccionEntity> findByIdAndUsuarioId(Long id, Long usuarioId);
}

