package com.financeai.classification;

public enum CategoriaTransaccion {

    PROFESIONALES("profesionales", "Gastos profesionales"),
    MASCOTAS("mascotas", "Mascotas"),
    ALIMENTACION("alimentacion", "Alimentación"),
    TRANSPORTE("transporte", "Transporte"),
    SALUD("salud", "Salud y bienestar"),
    EDUCACION("educacion", "Educación"),
    ENTRETENIMIENTO("entretenimiento", "Entretenimiento y ocio"),
    DEUDAS("deudas", "Deudas"),
    IMPUESTOS_Y_SEGUROS(
            "impuestos_y_seguros",
            "Impuestos y seguros"
    ),
    CUIDADO_PERSONAL(
            "cuidado_personal",
            "Cuidado personal y ropa"
    ),
    VIVIENDA("vivienda", "Vivienda y servicios"),
    OTROS("otros", "Otros");

    private final String codigo;
    private final String nombreVisible;

    CategoriaTransaccion(
            String codigo,
            String nombreVisible
    ) {
        this.codigo = codigo;
        this.nombreVisible = nombreVisible;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }
}


