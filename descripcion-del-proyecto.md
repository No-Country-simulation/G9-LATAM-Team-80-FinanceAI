Hackathon ONE – Proyectos G9 | Alura + Oracle

https://alura-es-cursos.github.io/proyectos-hackathon-g9-latam/


Descripción del proyecto

Crear una solución inteligente capaz de analizar el comportamiento financiero de un usuario a partir de sus transacciones e información financiera, generando una visión más completa de su salud financiera.
La solución deberá recibir información relacionada con gastos y hábitos financieros, como descripción de transacciones, montos, categorías de gastos, ingresos mensuales, frecuencia de ahorro, nivel de endeudamiento y otros indicadores relevantes.

Con base en estos datos, el sistema deberá ser capaz de:
Clasificar automáticamente los gastos en categorías financieras;
Identificar patrones de consumo;
Clasificar el perfil financiero del usuario;
Generar indicadores que ayuden a comprender los hábitos financieros;
Presentar recomendaciones simples para mejorar la salud financiera.

Este tipo de solución puede ser utilizada por aplicaciones financieras, billeteras digitales, plataformas de educación financiera o por usuarios que deseen organizar mejor sus finanzas personales.

La solución deberá devolver los resultados en formato JSON y utilizar servicios OCI para el almacenamiento, procesamiento o despliegue de la aplicación.


Necesidad del cliente

Muchas personas tienen acceso a los datos de sus transacciones, pero tienen dificultades para transformar esa información en conocimiento útil para la toma de decisiones.

La solución debe permitir:
Organizar automáticamente gastos e ingresos;
Comprender hacia dónde se dirige el dinero;
Identificar hábitos financieros positivos o de riesgo;
Recibir recomendaciones simples de mejora;
Realizar un seguimiento de la evolución del comportamiento financiero a lo largo del tiempo.

Este enfoque transforma datos financieros sin procesar en información clara y accionable.

Validación de mercado
El mercado de las fintechs, los bancos digitales y las plataformas de educación financiera continúa en expansión.

Los usuarios buscan herramientas que les permitan:
Automatizar el control financiero;
Comprender patrones de consumo;
Mejorar la capacidad de planificación;
Reducir riesgos financieros;
Recibir recomendaciones personalizadas.

Las soluciones que combinan el análisis de gastos y la evaluación del perfil financiero generan más valor que los clasificadores aislados, ya que ofrecen una visión más amplia del comportamiento del usuario.


Objetivo del Hackathon

Desarrollar un MVP funcional capaz de:
Clasificar automáticamente los gastos financieros;
Analizar el comportamiento financiero del usuario;
Generar una clasificación del perfil financiero;
Presentar recomendaciones personalizadas;
Poner los resultados a disposición mediante una API REST;
Utilizar al menos un servicio OCI como parte de la arquitectura de la solución.


Resultados esperados

Ciencia de Datos

Notebook que contenga:
Exploración y limpieza de datos (EDA);
Procesamiento de variables financieras y textuales;
Ingeniería de atributos;
Clasificación de gastos;
Análisis del perfil financiero;
Entrenamiento y evaluación de modelos;
Métricas de rendimiento adecuadas;
Serialización de los modelos.


Back-End

API REST que contenga:
Endpoint para análisis financiero;
Endpoint para clasificación de transacciones;
Validación de entrada;
Manejo de errores;
Documentación de los endpoints.


OCI

Uso de al menos uno de los siguientes servicios:
Object Storage para almacenamiento de modelos o datos;
OCI Compute para el alojamiento de la aplicación;
OCI Functions para procesamiento específico;
Base de datos opcional para la persistencia de información.
Funcionalidades obligatorias (MVP)
Clasificación de transacciones

El sistema deberá ser capaz de clasificar automáticamente los gastos en categorías como:
Alimentación;
Transporte;
Salud;
Vivienda;
Educación;
Ocio;
Servicios;
Otras categorías definidas por el equipo.

Análisis del perfil financiero
El sistema deberá generar una evaluación del perfil financiero del usuario con base en los datos analizados.

Ejemplos de categorías:
Saludable;
En observación;
En riesgo.

Las categorías podrán ser adaptadas por el equipo según la estrategia adoptada.


Recomendaciones financieras
La solución deberá generar recomendaciones simples y objetivas con base en los resultados obtenidos.

Ejemplos:
Reducir los gastos en una determinada categoría;
Aumentar la frecuencia de ahorro;
Mejorar el control de los gastos recurrentes.

Ejemplo de uso

Endpoint
POST /analisis-financiero

Entrada

{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "frecuencia_ahorro": "Media",
  "transacciones": [
    {
      "descripcion": "Supermercado",
      "valor": 420
    },
    {
      "descripcion": "Combustible",
      "valor": 300
    },
    {
      "descripcion": "Streaming",
      "valor": 40
    }
  ]
}


Salida

{
  "perfil_financiero": "En observación",
  "probabilidad": 0.82,
  "resumen_gastos": {
    "alimentacion": 420,
    "transporte": 300,
    "entretenimiento": 40
  },
  "recomendaciones": [
    "Monitorear los gastos recurrentes de entretenimiento",
    "Aumentar la reserva financiera mensual"
  ]
}


Requisitos mínimos
Modelo entrenado y cargado correctamente;
Validación de entrada;
Clasificación funcional de las transacciones;
Análisis del perfil financiero;
Generación de recomendaciones;
API documentada;
Integración con OCI;
Mínimo de tres ejemplos reales de uso.

Recursos opcionales
Dashboard financiero;
Visualización de la evolución financiera;
Procesamiento por lotes mediante CSV;
Historial de análisis;
Alertas de gastos elevados;
Containerización con Docker;
Pruebas automatizadas;
Exportación de informes;
Explicabilidad de los modelos.


Directrices para Ciencia de Datos

Cada equipo deberá construir su propio conjunto de datos financieros.

Los datos podrán ser:
Obtenidos de fuentes públicas;
Generados mediante simulaciones;
Construidos manualmente por el equipo.

Se recomienda utilizar:
Python;
Pandas;
Scikit-Learn;
Técnicas de clasificación supervisada;
Ingeniería de atributos;
Modelos de clasificación adecuados para el problema.

Se permite el uso de otros enfoques.


Directrices para Back-End

El equipo deberá desarrollar una API REST, preferentemente utilizando Java con Spring Boot.

La solución deberá:
Recibir información financiera;
Procesar clasificaciones y análisis;
Devolver respuestas estructuradas en formato JSON;
Integrar el modelo de Ciencia de Datos con el backend.
La arquitectura adoptada deberá ser documentada por el equipo.


OCI

La solución debe utilizar al menos un servicio OCI como parte obligatoria del proyecto.