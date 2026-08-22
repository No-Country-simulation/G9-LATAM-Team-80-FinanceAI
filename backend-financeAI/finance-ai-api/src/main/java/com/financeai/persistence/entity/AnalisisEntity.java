package com.financeai.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "analisis_financieros")
public class AnalisisEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(name = "ingreso_mensual", nullable = false, precision = 15, scale = 2)
    private BigDecimal ingresoMensual;
    @Column(name = "nivel_endeudamiento", nullable = false, precision = 6, scale = 2)
    private BigDecimal nivelEndeudamiento;
    @Column(name = "frecuencia_ahorro", nullable = false, length = 20)
    private String frecuenciaAhorro;
    @Column(name = "perfil_financiero", nullable = false, length = 40)
    private String perfilFinanciero;
    @Column(nullable = false, precision = 8, scale = 6)
    private BigDecimal probabilidad;
    @Column(name = "gasto_total_mes", nullable = false, precision = 15, scale = 2)
    private BigDecimal gastoTotalMes;
    @Column(name = "ahorro_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal ahorroTotal;
    @Lob @Column(name = "resultado_json", nullable = false, columnDefinition = "LONGTEXT")
    private String resultadoJson;
    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void alCrear() {
        creadoEn = LocalDateTime.now();
    }

    protected AnalisisEntity() {}
    public AnalisisEntity(Usuario usuario, BigDecimal ingreso, BigDecimal deuda, String frecuencia,
                           String perfil, BigDecimal probabilidad, BigDecimal gasto, BigDecimal ahorro, String json) {
        this.usuario = usuario; this.ingresoMensual = ingreso; this.nivelEndeudamiento = deuda;
        this.frecuenciaAhorro = frecuencia; this.perfilFinanciero = perfil; this.probabilidad = probabilidad;
        this.gastoTotalMes = gasto; this.ahorroTotal = ahorro; this.resultadoJson = json;
    }
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public BigDecimal getIngresoMensual() { return ingresoMensual; }
    public BigDecimal getNivelEndeudamiento() { return nivelEndeudamiento; }
    public String getFrecuenciaAhorro() { return frecuenciaAhorro; }
    public String getPerfilFinanciero() { return perfilFinanciero; }
    public BigDecimal getProbabilidad() { return probabilidad; }
    public BigDecimal getGastoTotalMes() { return gastoTotalMes; }
    public BigDecimal getAhorroTotal() { return ahorroTotal; }
    public String getResultadoJson() { return resultadoJson; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
