package com.financeai.classification;

public enum CategoriaTransaccion {

    ALIMENTACION("Alimentación"),
    TRANSPORTE("Transporte"),
    SALUD("Salud"),
    VIVIENDA("Vivienda"),
    EDUCACION("Educación"),
    ENTRETENIMIENTO("Entretenimiento"),
    SERVICIOS("Servicios"),
    OTROS("Otros");

    private final String nombreVisible;

    CategoriaTransaccion(String nombreVisible) {
        this.nombreVisible = nombreVisible;
    }

    public String getNombreVisible() {
        return nombreVisible;
    }
}

