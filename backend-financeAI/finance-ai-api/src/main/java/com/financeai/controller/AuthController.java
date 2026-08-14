package com.financeai.controller;

import com.financeai.dto.AuthDtos.*;
import com.financeai.service.AuthService;
import com.financeai.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final SesionService sesiones;
    public AuthController(AuthService auth, SesionService sesiones) { this.auth = auth; this.sesiones = sesiones; }
    @PostMapping("/login") public LoginResponse login(@Valid @RequestBody LoginRequest request) { return auth.login(request); }
    @GetMapping("/me") public UsuarioResponse me(@RequestHeader("Authorization") String authorization) { return auth.respuesta(sesiones.requerirUsuario(authorization)); }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) { auth.logout(authorization); }
}

