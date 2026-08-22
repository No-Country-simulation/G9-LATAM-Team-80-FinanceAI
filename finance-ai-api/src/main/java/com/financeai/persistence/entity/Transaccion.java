package com.financeai.persistence.entity;

import com.financeai.domain.TipoTransaccion;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transacciones")
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 200)
    private String descripcion;

    @Column(nullable = false, length = 50)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoTransaccion tipo;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void alCrear() {
        creadoEn = LocalDateTime.now();
    }

    protected Transaccion() {
    }

    public Transaccion(Long usuarioId, String descripcion, String categoria,
                       TipoTransaccion tipo, LocalDate fecha, BigDecimal monto) {
        this.usuarioId = usuarioId;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.tipo = tipo;
        this.fecha = fecha;
        this.monto = monto;
    }

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public String getDescripcion() { return descripcion; }
    public String getCategoria() { return categoria; }
    public TipoTransaccion getTipo() { return tipo; }
    public LocalDate getFecha() { return fecha; }
    public BigDecimal getMonto() { return monto; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
