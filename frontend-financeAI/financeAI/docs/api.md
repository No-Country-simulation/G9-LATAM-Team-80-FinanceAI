# API

Endpoint principal esperado:

```http
POST /analisis-financiero
```

Entrada:

```json
{
  "ingreso_mensual": 4500,
  "nivel_endeudamiento": 25,
  "frecuencia_ahorro": "Media",
  "transacciones": [
    { "descripcion": "Supermercado", "valor": 420 }
  ]
}
```

Salida:

```json
{
  "perfil_financiero": "En observacion",
  "probabilidad": 0.82,
  "resumen_gastos": {
    "alimentacion": 420
  },
  "recomendaciones": [
    "Aumentar la reserva financiera mensual"
  ]
}
```
