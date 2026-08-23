package com.financeai.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transacciones")
public class TransaccionEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(nullable = false, length = 200)
    private String descripcion;
    /**
     * Solo los gastos tienen categoria. Ingresos y ahorros guardan null: las doce
     * categorias del catalogo son de gasto y usar "otros" como relleno inventaba un
     * dato que despues aparecia en pantalla como si fuera real.
     */
    @Column(length = 50)
    private String categoria;
    @Column(nullable = false, length = 20)
    private String tipo;
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

    protected TransaccionEntity() {}
    public TransaccionEntity(Usuario usuario, String descripcion, String categoria, String tipo, LocalDate fecha, BigDecimal monto) {
        this.usuario = usuario; this.descripcion = descripcion; this.categoria = categoria;
        this.tipo = tipo; this.fecha = fecha; this.monto = monto;
    }
    public void actualizar(String descripcion, String categoria, String tipo, LocalDate fecha, BigDecimal monto) {
        this.descripcion = descripcion; this.categoria = categoria; this.tipo = tipo; this.fecha = fecha; this.monto = monto;
    }
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public String getDescripcion() { return descripcion; }
    public String getCategoria() { return categoria; }
    public String getTipo() { return tipo; }
    public LocalDate getFecha() { return fecha; }
    public BigDecimal getMonto() { return monto; }
}

