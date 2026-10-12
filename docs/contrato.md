## Módulo: Pagos y Cuenta Corriente 

### 1. `api/pagos.php`

#### GET `api/pagos.php?cliente_id={id}`

Lista todos los pagos registrados para una clienta, ordenados por fecha descendente.

* **Headers**: `Authorization: Bearer <token>`
* **Respuesta exitosa (200 OK)**:
```json
[
  {
    "id": 1,
    "cliente_id": 1,
    "fecha": "2026-10-10 14:30:00",
    "monto": 20000.00,
    "medio": "efectivo",
    "observacion": "Seña inicial"
  }
] 
```

* **Errores**:
  * `400 Bad Request`: `{"error": "El parametro cliente_id es obligatorio."}`
  * `401 Unauthorized`: Token no válido o ausente.


#### POST `api/pagos.php`

Registra un nuevo pago en el sistema.

* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Cuerpo recibido (Body)**:
```json
{
  "cliente_id": 1,
  "monto": 15000.00,
  "medio": "transferencia",
  "observacion": "Pago cuota 1"
}
```

* **Respuesta exitosa (201 Created)**:
```json
{
  "mensaje": "Pago registrado correctamente",
  "pago": {
    "id": 3,
    "cliente_id": 1,
    "monto": 15000.00,
    "medio": "transferencia",
    "observacion": "Pago cuota 1"
  }
}
```

* **Errores**:
  * `400 Bad Request`: `{"error": "El ID de clinte es obligatorio."}`
  * `401 Unauthorized`: Token no válido o ausente.
  * `404 Not Found`: `{"error": "La clienta no existe o se encuentra inactiva."}`
  * `422 Unprocessable Entity`: `{"error": "El monto del pago debe ser mayor a 0."}`


### 2. `api/resumen.php`

#### GET `api/resumen.php?cliente_id={id}`

Devuelve la ficha financiera consolidada de la clienta

* **Headers**: `Authorization: Bearer <token>`
* **Respuesta exitosa (200 OK)**:

```json
{
  "cliente": {
    "id": 1,
    "nombre": "Laura Gómez",
    "telefono": "5492914000001"
  },
  "total_compras": 110000.00,
  "total_pagos": 50000.00,
  "saldo_actual": 60000.00,
  "prendas_en_prueba": [
    {
      "producto_id": 4,
      "descripcion": "Vestido lino",
      "talle": "M",
      "precio_unitario": 25000.00
    }
  ],
  "pagos": [
    {
      "id": 1,
      "fecha": "2026-10-10 14:30:00",
      "monto": 30000.00,
      "medio": "transferencia"
    }
  ]
}
```

* **Errores**:
  * `400 Bad Request`: `{"error": "El parametro cliente_id es obligatorio."}`
  * `401 Unauthorized`: Token no válido o ausente.
  * `404 Not Found`: `{"error": "Cliente no encontrado."}`


#### GET `api/resumen.php?deudores=1`

Lista todas las clientas con saldo deudor (saldo > 0), ordenadas de mayor a menor deuda.

* **Headers**: `Authorization: Bearer <token>`
* **Respuesta exitosa (200 OK)**:

```json
{
  "total_deuda_general": 60000.00,
  "deudores": [
    {
      "cliente_id": 1,
      "nombre": "Laura Gómez",
      "telefono": "5492914000001",
      "saldo": 60000.00
    }
  ]
}
```

* **Errores**:
  * `401 Unauthorized`: Token no válido o ausente.









