package com.financeai.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "presupuestos", uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "categoria"}))
public class PresupuestoEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(nullable = false, length = 50)
    private String categoria;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;
    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    protected PresupuestoEntity() {}
    public PresupuestoEntity(Usuario usuario, String categoria, BigDecimal monto) {
        this.usuario = usuario; this.categoria = categoria; this.monto = monto;
    }
    public void actualizarMonto(BigDecimal monto) { this.monto = monto; this.actualizadoEn = LocalDateTime.now(); }
    public Long getId() { return id; }
    public String getCategoria() { return categoria; }
    public BigDecimal getMonto() { return monto; }
}

