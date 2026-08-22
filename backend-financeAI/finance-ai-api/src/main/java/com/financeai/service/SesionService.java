package com.financeai.service;

import com.financeai.persistence.entity.Sesion;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.SesionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Service
public class SesionService {
    private final SesionRepository sesiones;
    public SesionService(SesionRepository sesiones) { this.sesiones = sesiones; }

    public Usuario requerirUsuario(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Debes iniciar sesion");
        }
        String token = authorization.substring(7).trim();
        return sesiones.findByTokenAndExpiraEnAfter(token, LocalDateTime.now())
                .map(Sesion::getUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesion expiro o no es valida"));
    }
}

