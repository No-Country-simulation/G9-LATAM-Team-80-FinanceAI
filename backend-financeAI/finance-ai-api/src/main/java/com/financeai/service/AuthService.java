package com.financeai.service;

import com.financeai.dto.AuthDtos.*;
import com.financeai.persistence.entity.Sesion;
import com.financeai.persistence.entity.Usuario;
import com.financeai.persistence.repository.SesionRepository;
import com.financeai.persistence.repository.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {
    private final UsuarioRepository usuarios;
    private final SesionRepository sesiones;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final long horasSesion;

    public AuthService(UsuarioRepository usuarios, SesionRepository sesiones, @Value("${financeai.session.hours}") long horasSesion) {
        this.usuarios = usuarios; this.sesiones = sesiones; this.horasSesion = horasSesion;
    }

    @PostConstruct @Transactional
    public void crearUsuarioInicial() {
        usuarios.findByEmailIgnoreCase("demo@financeai.local").orElseGet(() ->
                usuarios.save(new Usuario("Usuario FinanceAI", "demo@financeai.local", encoder.encode("FinanceAI2026!"))));
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarios.findByEmailIgnoreCase(request.email().trim())
                .filter(item -> encoder.matches(request.password(), item.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contrasena incorrectos"));
        String token = UUID.randomUUID().toString();
        sesiones.save(new Sesion(token, usuario, LocalDateTime.now().plusHours(horasSesion)));
        return new LoginResponse(token, respuesta(usuario));
    }

    @Transactional
    public void logout(String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) sesiones.deleteById(authorization.substring(7).trim());
    }

    public UsuarioResponse respuesta(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(), usuario.getRol());
    }
}
