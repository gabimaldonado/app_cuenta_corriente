# Módulo: Pagos y Cuenta Corriente 

## `api/pagos.php`

### GET - listar pagos de una clienta

`GET api/pagos.php?cliente_id={id}`

Devuelve todos los pagos registrados para la clienta indicada, ordenados por fecha descendente (del más reciente al más antiguo).

**200**:
```json
[
  {
    "id": 2,
    "cliente_id": 1,
    "fecha": "2026-10-01 18:00:00",
    "monto": 30000.00,
    "medio": "transferencia",
    "observacion": null
  },
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
Si la clienta no tiene pagos registrados devuelve [] (con 200).

### POST - Registrar un nuevo pago

`POST api/pagos.php`

Registra un nuevo pago en el sistema.


```json
{
  "cliente_id": 1,
  "monto": 15000.00,
  "medio": "transferencia",
  "observacion": "Pago cuota 1"
}
```
cliente_id y monto son obligatorios. medio es opcional (por defecto efectivo). observacion es opcional.


**201: el pago registrado, con su id asignado.**

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
### Errores de pagos

| Caso | Código | Mensaje |
| --- | --- | --- |
| Falta el nombre `cliente_id` en GET | 400 | `El parametro cliente_id es obligatorio.` |
| Falta `cliente_id` en el cuerpo del POST | 400 | `El ID de cliente es obligatorio.` |
| Monto menor o igual a 0 | 422 | `El monto del pago debe ser mayor a 0.` |
| Clienta inexistente o dada de baja | 404 | `La clienta no existe o se encuentra inactiva.` |
| Falta o es inválido el token | 401 | `No autorizado` |
| Método no permitido | 405 | `Método no permitido` |

---

## `api/resumen.php`

### GET - Ficha financiera de una clienta

`GET api/resumen.php?cliente_id=1`

Devuelve totales acumulados, saldo actual, prendas que mantiene a prueba y el historial de pagos.

**200**:

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

### GET - Panel de clientes deudoras 

`GET api/resumen.php?deudores=1`

Lista todas las clientas con saldo deudor (saldo > 0), ordenadas de mayor a menor deuda.


**200**:

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

### Errores de resumen

| Caso | Código | Mensaje |
| --- | --- | --- |
| Falta de parametro `cliente_id` | 400 | `El parametro cliente_id es obligatorio.` |
| Clienta no encontrada o inactiva | 404 | `Clienta no encontrada` |
| Falta o es inválido el token | 401 | `No autorizado` |
| Método no permitido | 405 | `Método no permitido` |

---









