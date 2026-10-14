# Contrato JSON — Clientes y Productos

Reglas generales (valen para todos los endpoints):

- Todas las respuestas son JSON, también los errores.
- Los errores tienen siempre la forma: `{ "error": "mensaje claro" }`
- Todos los pedidos llevan el header `Authorization: Bearer <token>`. Sin token o con token inválido → **401**.
- Nombres de campos en español, minúsculas y guion bajo.
- El teléfono se envía y se guarda **solo con dígitos y código de país** (ej: `5491145678901`).

---

## api/clientes.php

### GET — listar clientes

`GET api/clientes.php`
`GET api/clientes.php?buscar=gomez` (busca por nombre **o DNI**)

Devuelve solo clientes con `activo = 1`, ordenados por nombre.

**200**
```json
[
  {
    "id": 1,
    "nombre": "María Gómez",
    "telefono": "5491145678901",
    "dni": "30123456",
    "direccion": "Av. Corrientes 1234, CABA",
    "notas": "Prefiere que la llamen por la tarde",
    "activo": 1
  }
]
```
Si no hay resultados devuelve `[]` (con 200, no es un error).

### GET — un cliente

`GET api/clientes.php?id=1`

**200**: el objeto del cliente (igual al de arriba).
**404**: `{ "error": "Cliente no encontrado" }`

### POST — crear cliente

`POST api/clientes.php`

**Recibe**
```json
{
  "nombre": "Ana Ruiz",
  "telefono": "5491122334455",
  "dni": "33444555",
  "direccion": "Calle 1 123",
  "notas": ""
}
```
`nombre` y `telefono` son obligatorios. `dni`, `direccion` y `notas` son opcionales (el DNI puede venir `null`).

**201**: el cliente creado, con su `id`.
**400**: validación fallida (ver tabla de errores).

### PUT — editar cliente

`PUT api/clientes.php?id=1`

Recibe los mismos campos que el POST (se envían todos). Se validan igual.

**200**: el cliente actualizado.
**400**: validación fallida.
**404**: el cliente no existe.

## DELETE — borrado lógico

`DELETE api/clientes.php?id=1`

No borra la fila: marca `activo = 0`.

**200**: `{ "mensaje": "Cliente dado de baja" }`
**404**: el cliente no existe.

## Errores de clientes

| Caso | Código | Mensaje |
| --- | --- | --- |
| Falta el nombre | 400 | `El nombre es obligatorio` |
| Teléfono vacío o con formato inválido (10 a 15 dígitos) | 400 | `El teléfono debe tener entre 10 y 15 dígitos, con código de país` |
| DNI informado con formato inválido (debe tener 7 u 8 dígitos) | 400 | `El DNI debe tener 7 u 8 dígitos` |
| DNI ya registrado | 400 | `Ya existe un cliente con ese DNI` |
| Nombre > 100, dirección > 150 o notas > 255 caracteres | 400 | `Algún campo supera el largo permitido` |
| `id` inexistente | 404 | `Cliente no encontrado` |
| Falta o es inválido el token | 401 | `No autorizado` |
| Método no permitido | 405 | `Método no permitido` |

---

## api/productos.php

## GET — listar prendas

`GET api/productos.php`
`GET api/productos.php?buscar=jean` (busca en descripción, talle **o** color)
`GET api/productos.php?stock=con` (solo `stock > 0`)
`GET api/productos.php?stock=sin` (solo `stock = 0`)

Los filtros se pueden combinar. Devuelve solo prendas con `activo = 1`.

**200**
```json
[
  {
    "id": 1,
    "descripcion": "Jean",
    "talle": "38",
    "color": "Azul",
    "precio": 45000.00,
    "stock": 4,
    "foto": null,
    "activo": 1
  }
]
```

## GET — una prenda

`GET api/productos.php?id=1`

**200**: el objeto. **404**: `{ "error": "Prenda no encontrada" }`

## POST — crear prenda

**Recibe**
```json
{
  "descripcion": "Jean",
  "talle": "38",
  "color": "Azul",
  "precio": 45000,
  "stock": 4
}
```
Todos obligatorios (`foto` es opcional).

**201**: la prenda creada, con su `id`.

## PUT — editar prenda

`PUT api/productos.php?id=1`: recibe los mismos campos que el POST.

**200**: la prenda actualizada. **404**: no existe.

## DELETE — borrado lógico

`DELETE api/productos.php?id=1`: marca `activo = 0`.

**200**: `{ "mensaje": "Prenda dada de baja" }`. **404**: no existe.

## Errores de productos

| Caso | Código | Mensaje |
| --- | --- | --- |
| Falta descripción, talle o color | 400 | `La descripción, el talle y el color son obligatorios` |
| Precio no numérico o negativo | 400 | `El precio debe ser un número mayor o igual a 0` |
| Stock no entero o negativo | 400 | `El stock debe ser un entero mayor o igual a 0` |
| `id` inexistente | 404 | `Prenda no encontrada` |
| Falta o es inválido el token | 401 | `No autorizado` |
| Método no permitido | 405 | `Método no permitido` |

---

## Pendiente de acordar con otros integrantes

- Los filtros de clientes **«Con deuda»** y **«Con prendas a prueba»** dependen de datos de los integrantes 3 y 4. La propuesta es que el frontend los resuelva cruzando `clientes.php` con `resumen.php?deudores=1`, sin tocar este endpoint.
- Los integrantes 3 y 4 descuentan y devuelven stock directamente en la base, así que `productos.php` no se usa para eso.