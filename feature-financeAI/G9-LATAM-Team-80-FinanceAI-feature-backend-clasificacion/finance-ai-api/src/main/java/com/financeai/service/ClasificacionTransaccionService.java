package com.financeai.service;

import com.financeai.classification.CategoriaTransaccion;
import com.financeai.classification.ResultadoClasificacion;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class ClasificacionTransaccionService {

    private static final Pattern MARCAS_DIACRITICAS = Pattern.compile("\\p{M}+");
    private static final Map<CategoriaTransaccion, List<String>> PALABRAS_CLAVE = crearPalabrasClave();

    public ResultadoClasificacion clasificar(String descripcion) {
        String descripcionNormalizada = normalizar(descripcion);
        CategoriaTransaccion categoriaSeleccionada = CategoriaTransaccion.OTROS;
        List<String> mejoresCoincidencias = List.of();

        for (Map.Entry<CategoriaTransaccion, List<String>> entrada : PALABRAS_CLAVE.entrySet()) {
            List<String> coincidencias = entrada.getValue().stream()
                    .filter(palabraClave -> contienePalabraOFrase(descripcionNormalizada, palabraClave))
                    .toList();

            if (coincidencias.size() > mejoresCoincidencias.size()) {
                categoriaSeleccionada = entrada.getKey();
                mejoresCoincidencias = coincidencias;
            }
        }

        int puntuacion = mejoresCoincidencias.size();
        return new ResultadoClasificacion(
                categoriaSeleccionada,
                calcularConfianza(puntuacion),
                puntuacion,
                List.copyOf(mejoresCoincidencias)
        );
    }

    private boolean contienePalabraOFrase(String descripcion, String palabraClave) {
        return (" " + descripcion + " ").contains(" " + palabraClave + " ");
    }

    private String normalizar(String texto) {
        if (texto == null || texto.isBlank()) {
            return "";
        }

        String minusculas = texto.toLowerCase(Locale.ROOT).trim();
        String sinAcentos = MARCAS_DIACRITICAS.matcher(
                Normalizer.normalize(minusculas, Normalizer.Form.NFD)
        ).replaceAll("");

        return sinAcentos.replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private double calcularConfianza(int puntuacion) {
        if (puntuacion == 0) {
            return 0.30;
        }
        return Math.min(0.95, 0.60 + (puntuacion * 0.10));
    }

    private static Map<CategoriaTransaccion, List<String>> crearPalabrasClave() {
        Map<CategoriaTransaccion, List<String>> palabrasClave =
                new EnumMap<>(CategoriaTransaccion.class);

        palabrasClave.put(
                CategoriaTransaccion.PROFESIONALES,
                List.of(
                        "freelance", "cliente", "proveedor",
                        "oficina", "software", "hosting",
                        "dominio", "computador", "laptop"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.MASCOTAS,
                List.of(
                        "mascota", "veterinaria", "veterinario",
                        "perro", "gato", "croquetas", "petshop"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.ALIMENTACION,
                List.of(
                        "supermercado", "restaurante", "comida",
                        "cafe", "panaderia", "delivery",
                        "almuerzo", "cena"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.TRANSPORTE,
                List.of(
                        "uber", "taxi", "gasolina", "combustible",
                        "autobus", "bus", "peaje", "parqueadero"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.SALUD,
                List.of(
                        "farmacia", "medico", "hospital",
                        "clinica", "medicina", "terapia",
                        "odontologo", "laboratorio"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.EDUCACION,
                List.of(
                        "curso", "universidad", "colegio",
                        "libro", "matricula", "capacitacion",
                        "instituto", "certificacion"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.ENTRETENIMIENTO,
                List.of(
                        "cine", "netflix", "spotify",
                        "videojuego", "concierto", "streaming",
                        "hotel", "turismo"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.DEUDAS,
                List.of(
                        "tarjeta de credito", "prestamo",
                        "credito", "cuota", "interes",
                        "mora", "sobregiro", "hipoteca"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.IMPUESTOS_Y_SEGUROS,
                List.of(
                        "impuesto", "predial", "vehicular",
                        "seguro", "poliza", "prima de seguro",
                        "comision bancaria"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.CUIDADO_PERSONAL,
                List.of(
                        "ropa", "calzado", "zapatos",
                        "peluqueria", "barberia",
                        "manicure", "maquillaje", "perfume"
                )
        );

        palabrasClave.put(
                CategoriaTransaccion.VIVIENDA,
                List.of(
                        "alquiler", "arriendo", "condominio",
                        "electricidad", "agua", "internet",
                        "telefono", "celular", "mantenimiento"
                )
        );

        return Map.copyOf(palabrasClave);
    }
}
