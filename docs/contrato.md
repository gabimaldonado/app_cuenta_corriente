# Contrato JSON — Clientes y Productos

Reglas generales (valen para todos los endpoints):

- Todas las respuestas son JSON, también los errores. La única excepción es el **204**, que no tiene cuerpo.
- Los errores tienen siempre la forma: `{ "error": "mensaje claro" }`
- Todos los pedidos llevan el header `Authorization: Bearer <token>`. Sin token o con token inválido → **401**.
- Nombres de campos en español, minúsculas y guion bajo.
- El teléfono se envía y se guarda **solo con dígitos y código de país** (ej: `5491145678901`).
- Códigos de estado: **200** bien, **201** creado, **204** hecho sin contenido, **400** pedido mal armado, **401** sin sesión, **404** no existe, **405** método no permitido, **422** el pedido está bien armado pero el dato no se puede procesar, **500** falló el servidor.

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
    "direccion": "Av. Corrientes 1234",
    "ciudad": "Quilmes",
    "notas": "Prefiere que la llamen por la tarde",
    "latitud": -34.7242,
    "longitud": -58.2526,
    "activo": 1
  }
]
```
`latitud` y `longitud` son números, o `null` si la clienta no tiene ciudad o no se pudo ubicar.
Si no hay resultados devuelve `[]` (con 200, no es un error).

### GET — una clienta

`GET api/clientes.php?id=1`

**200**: el objeto de la clienta (igual al de arriba).
**404**: `{ "error": "Cliente no encontrado" }`

### POST — crear clienta

`POST api/clientes.php`

**Recibe**
```json
{
  "nombre": "Ana Ruiz",
  "telefono": "5491122334455",
  "dni": "33444555",
  "direccion": "Calle 1 123",
  "ciudad": "Quilmes",
  "notas": ""
}
```
`nombre` y `telefono` son obligatorios. `dni`, `direccion`, `ciudad` y `notas` son opcionales.

**Geocodificación:** si viene `ciudad`, el servidor consulta Open-Meteo (desde `servicios.php`) y guarda `latitud` y `longitud`.
- Ciudad encontrada: se guardan las coordenadas.
- Ciudad que no existe: **422** y no se guarda nada.
- Servicio externo caído: se guarda igual la clienta, con `latitud` y `longitud` en `null`.

**201**: la clienta creada, con su `id` y sus coordenadas.
**400**: validación fallida (ver tabla de errores).
**422**: `{ "error": "No se encontró la ciudad indicada. Revisá cómo está escrita." }`

### PUT — editar clienta

`PUT api/clientes.php?id=1`

Recibe los mismos campos que el POST (se envían todos). Se validan igual. Si la ciudad no cambió y ya tenía coordenadas, se conservan; si cambió, se vuelve a geocodificar.

**200**: la clienta actualizada.
**400**: validación fallida.
**404**: la clienta no existe.
**422**: la ciudad no existe.

### DELETE — borrado lógico

`DELETE api/clientes.php?id=1`

No borra la fila: marca `activo = 0`.

**204**: sin cuerpo.
**404**: la clienta no existe o ya estaba dada de baja.

### Errores de clientes

| Caso | Código | Mensaje |
| --- | --- | --- |
| Cuerpo que no es JSON | 400 | `El cuerpo del pedido debe ser un JSON válido` |
| Falta el nombre | 400 | `El nombre es obligatorio` |
| Nombre > 100, dirección > 150, ciudad > 100 o notas > 255 caracteres | 400 | `Algún campo supera el largo permitido` |
| Teléfono vacío o con formato inválido (10 a 15 dígitos) | 400 | `El teléfono debe tener entre 10 y 15 dígitos, con código de país` |
| DNI informado con formato inválido (debe tener 7 u 8 dígitos) | 400 | `El DNI debe tener 7 u 8 dígitos` |
| DNI ya registrado | 400 | `Ya existe un cliente con ese DNI` |
| `id` ausente o que no es un número | 400 | `Falta el id o no es válido` |
| `id` inexistente | 404 | `Cliente no encontrado` |
| La ciudad no existe | 422 | `No se encontró la ciudad indicada. Revisá cómo está escrita.` |
| Falta o es inválido el token | 401 | `Falta el token. Iniciá sesión.` |
| Método no permitido | 405 | `Método no permitido` |
| Falló la base | 500 | `Error interno del servidor` |

---

## api/productos.php

### GET — listar prendas

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
    "descripcion": "Jean recto",
    "talle": "38",
    "color": "Azul",
    "precio": 45000.0,
    "stock": 5,
    "foto": null,
    "activo": 1
  }
]
```

### GET — una prenda

`GET api/productos.php?id=1`

**200**: el objeto. **404**: `{ "error": "Prenda no encontrada" }`

### POST — crear prenda

**Recibe**
```json
{
  "descripcion": "Jean recto",
  "talle": "38",
  "color": "Azul",
  "precio": 45000,
  "stock": 4
}
```
Todos obligatorios (`foto` es opcional).

**201**: la prenda creada, con su `id`.

### PUT — editar prenda

`PUT api/productos.php?id=1`: recibe los mismos campos que el POST.

**200**: la prenda actualizada. **404**: no existe.

### DELETE — borrado lógico

`DELETE api/productos.php?id=1`: marca `activo = 0`.

**204**: sin cuerpo. **404**: no existe o ya estaba dada de baja.

### Errores de productos

| Caso | Código | Mensaje |
| --- | --- | --- |
| Cuerpo que no es JSON | 400 | `El cuerpo del pedido debe ser un JSON válido` |
| Falta descripción, talle o color | 400 | `La descripción, el talle y el color son obligatorios` |
| Algún campo supera el largo permitido (100, 10, 30 y 255) | 400 | `Algún campo supera el largo permitido` |
| Precio no numérico o negativo | 400 | `El precio debe ser un número mayor o igual a 0` |
| Stock no entero o negativo | 400 | `El stock debe ser un entero mayor o igual a 0` |
| Filtro `stock` distinto de `con` y `sin` | 400 | `El filtro stock solo acepta 'con' o 'sin'` |
| `id` ausente o que no es un número | 400 | `Falta el id o no es válido` |
| `id` inexistente | 404 | `Prenda no encontrada` |
| Falta o es inválido el token | 401 | `Falta el token. Iniciá sesión.` |
| Método no permitido | 405 | `Metodo no permitido` |
| Falló la base | 500 | `Error interno del servidor` |