package com.financeai.controller;

import com.financeai.dto.AuthDtos.*;
import com.financeai.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }
    @PostMapping("/login") public LoginResponse login(@Valid @RequestBody LoginRequest request) { return auth.login(request); }
    @GetMapping("/me") public UsuarioResponse me(@RequestHeader("Authorization") String authorization) { return auth.me(authorization); }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) { auth.logout(authorization); }
}

