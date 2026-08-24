package com.financeai.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
/**
 * Limite de gasto de UNA categoria en UN periodo.
 *
 * Antes la unicidad era (usuario, categoria) y el limite regia para siempre: cambiar el
 * de agosto cambiaba tambien el de septiembre y el de agosto del año anterior, aunque la
 * pantalla hablara de "presupuesto de agosto".
 */
@Table(name = "presupuestos", uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "categoria", "periodo"}))
public class PresupuestoEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(nullable = false, length = 50)
    private String categoria;
    /** AAAA-MM. Se guarda como texto: se compara y se ordena igual que una fecha. */
    @Column(nullable = false, length = 7)
    private String periodo;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monto;
    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    protected PresupuestoEntity() {}
    public PresupuestoEntity(Usuario usuario, String categoria, String periodo, BigDecimal monto) {
        this.usuario = usuario; this.categoria = categoria; this.periodo = periodo; this.monto = monto;
    }
    public void actualizarMonto(BigDecimal monto) { this.monto = monto; this.actualizadoEn = LocalDateTime.now(); }
    public Long getId() { return id; }
    public String getCategoria() { return categoria; }
    public String getPeriodo() { return periodo; }
    public BigDecimal getMonto() { return monto; }
}

