package com.financeai.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {
    private AuthDtos() {}
    public record LoginRequest(
            @Email(message = "El correo no es valido") @NotBlank String email,
            @NotBlank(message = "La contrasena es obligatoria") String password
    ) {}
    public record UsuarioResponse(Long id, String nombre, String email, String rol) {}
    public record LoginResponse(String token, UsuarioResponse usuario) {}
}

