package com.financeai.persistence.repository;

import com.financeai.persistence.entity.Sesion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public interface SesionRepository extends JpaRepository<Sesion, String> {
    Optional<Sesion> findByTokenAndExpiraEnAfter(String token, LocalDateTime ahora);
    void deleteByExpiraEnBefore(LocalDateTime ahora);
}

