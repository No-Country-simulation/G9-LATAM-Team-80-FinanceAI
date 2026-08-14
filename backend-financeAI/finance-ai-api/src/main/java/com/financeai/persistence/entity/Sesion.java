package com.financeai.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sesiones")
public class Sesion {
    @Id @Column(length = 36)
    private String token;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;
    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    protected Sesion() {}
    public Sesion(String token, Usuario usuario, LocalDateTime expiraEn) {
        this.token = token; this.usuario = usuario; this.expiraEn = expiraEn;
    }
    public String getToken() { return token; }
    public Usuario getUsuario() { return usuario; }
}

