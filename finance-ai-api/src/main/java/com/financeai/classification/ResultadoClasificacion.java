package com.financeai.classification;

import java.util.List;

public record ResultadoClasificacion(

        CategoriaTransaccion categoria,
        double confianza,
        int puntuacion,
        List<String> coincidencias

) {
}
