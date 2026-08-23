package com.financeai.dominio;

import java.util.Set;

/**
 * Las doce categorias oficiales, en un solo sitio del backend.
 *
 * Son categorias de GASTO: un ingreso o un ahorro no lleva ninguna. Hasta ahora el
 * backend no las conocia -- validaba que un gasto trajera categoria, pero no cual --,
 * asi que un POST con "banana" se guardaba y aparecia en el tablero como si fuera una
 * categoria real.
 *
 * La misma lista vive en el frontend (compartido/constantes/categorias.ts) y en el
 * servicio ML (clasificador.py, CATEGORIAS_OFICIALES). No se unifican en un artefacto
 * compartido porque son tres lenguajes distintos; lo que las mantiene sincronizadas es
 * tests/contract/test_categorias_consistentes.py, que lee las tres y falla si divergen.
 */
public final class CategoriasFinancieras {
    private CategoriasFinancieras() {}

    public static final Set<String> OFICIALES = Set.of(
            "profesionales",
            "mascotas",
            "alimentacion",
            "transporte",
            "salud",
            "educacion",
            "entretenimiento",
            "deudas",
            "impuestos_y_seguros",
            "cuidado_personal",
            "vivienda",
            "otros"
    );

    /** Cadena vacia y null cuentan como "sin categoria", que es valido segun el tipo. */
    public static boolean esValidaOAusente(String categoria) {
        return categoria == null || categoria.isBlank() || OFICIALES.contains(categoria);
    }
}
