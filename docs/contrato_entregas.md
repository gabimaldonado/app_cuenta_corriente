# Contrato JSON — Entregas a prueba

Módulo del integrante 3. Endpoints: `api/entregas.php` y `api/confirmar_entrega.php`.

## Reglas generales

- Todas las respuestas son JSON, también las de error.
- Todos los pedidos necesitan el encabezado `Authorization: Bearer <token>` (el token lo devuelve `login.php`).
- Los errores tienen siempre la misma forma: `{"error": "mensaje"}`.
- Los números viajan como números (`id`, `cliente_id`, `precio_unitario`). La `fecha` viaja como texto con el formato `AAAA-MM-DD HH:MM:SS`.
- Nombres en minúscula con guion bajo, igual que en la base de datos.

### Errores de autenticación (los devuelve `auth.php`, valen para todos los endpoints)

| Código | Cuándo | Mensaje |
| --- | --- | --- |
| 401 | Falta el encabezado `Authorization` | `Falta el token. Iniciá sesión.` |
| 401 | El token no existe o venció | `Token inválido o vencido. Iniciá sesión de nuevo.` |

## Estados

**Entrega** (`entregas.estado`)

| Estado | Significado |
| --- | --- |
| `abierta` | La clienta todavía tiene prendas a prueba |
| `cerrada` | Ya se decidió qué se queda y qué devuelve |

**Prenda de una entrega** (`entrega_items.estado`)

| Estado | Significado | ¿Suma al saldo? |
| --- | --- | --- |
| `en_prueba` | Se la llevó a probar | No |
| `comprada` | Se la quedó | Sí |
| `devuelta` | La devolvió, vuelve al stock | No |

El saldo nunca se guarda: se calcula como la suma de `precio_unitario` de los ítems en estado `comprada` menos los pagos.

---

## GET `/api/entregas.php`

Lista entregas. Cada entrega incluye sus prendas en `entrega_items`.

### Parámetros (opcionales; si se manda más de uno, se usa el primero de esta lista)

| Parámetro | Qué hace |
| --- | --- |
| `id` | Devuelve **una sola** entrega (un objeto, no una lista) |
| `cliente_id` | Devuelve las entregas de esa clienta |
| `estado` | Devuelve las entregas con ese estado (`abierta` o `cerrada`) |
| (ninguno) | Devuelve todas, de la más nueva a la más vieja |

### Respuesta 200 — lista (sin `id`)

```json
[
  {
    "id": 2,
    "cliente_id": 2,
    "fecha": "2026-09-28 17:00:00",
    "estado": "abierta",
    "entrega_items": [
      { "id": 6, "entrega_id": 2, "producto_id": 6, "precio_unitario": 35000.0, "estado": "en_prueba" },
      { "id": 7, "entrega_id": 2, "producto_id": 7, "precio_unitario": 30000.0, "estado": "en_prueba" }
    ]
  }
]
```

Si no hay entregas que coincidan, responde `200` con una lista vacía `[]`. Esto incluye un `cliente_id` o un `estado` que no existen.

### Respuesta 200 — con `?id=`

El mismo objeto de arriba, sin los corchetes de la lista.

### Errores

| Código | Cuándo | Mensaje |
| --- | --- | --- |
| 404 | `?id=` de una entrega que no existe | `No existe esa entrega` |
| 405 | Método distinto de GET y POST | `Método no permitido` |

---

## POST `/api/entregas.php`

Crea una entrega con sus prendas. Todo se hace en una **transacción**: si algo falla, no queda nada guardado.

Por cada prenda: se guarda un ítem en estado `en_prueba` con el precio de ese momento, y se descuenta 1 del stock. **No se modifica ningún saldo.**

### Cuerpo del pedido

```json
{ "cliente_id": 1, "productos": [1, 2] }
```

| Campo | Tipo | Obligatorio | Detalle |
| --- | --- | --- | --- |
| `cliente_id` | número | Sí | Tiene que ser una clienta existente y activa |
| `productos` | lista de números | Sí | Ids de las prendas. No puede estar vacía |

### Respuesta 201

```json
{ "id": 4, "cliente_id": 1, "estado": "abierta" }
```

El `id` es el de la entrega nueva. La fecha la pone la base de datos.

### Errores

| Código | Cuándo | Mensaje |
| --- | --- | --- |
| 400 | Falta `cliente_id` o `productos`, o `productos` no es una lista o está vacía | `Faltan cliente_id o productos` |
| 400 | La clienta está dada de baja | `La clienta está dada de baja` |
| 400 | Algún valor de `productos` no es un número | `Cada prenda tiene que ser un número de id` |
| 400 | No hay stock de una prenda | `No hay stock de la prenda con id N` |
| 404 | La clienta no existe | `No existe esa clienta` |
| 404 | Una prenda no existe | `No existe la prenda con id N` |
| 500 | Falló la base de datos | `No se pudo crear la entrega` |

Cuando falla una prenda, la transacción se deshace completa: no queda la entrega, ni los ítems, ni el stock descontado de las prendas anteriores.

---

## PUT `/api/confirmar_entrega.php`

Cierra una entrega: las prendas indicadas pasan a `comprada`, **todas las demás** de esa entrega pasan a `devuelta` y vuelven al stock (+1 cada una). La entrega pasa a `cerrada`. Todo en una transacción.

Este es el único momento en que algo empieza a sumar al saldo de la clienta.

### Cuerpo del pedido

```json
{ "entrega_id": 4, "items": [10] }
```

| Campo | Tipo | Obligatorio | Detalle |
| --- | --- | --- | --- |
| `entrega_id` | número | Sí | Id de la entrega a cerrar |
| `items` | lista de números | Sí | Ids de `entrega_items` que la clienta **se queda**. Puede ser `[]` si devuelve todo |

Ojo: `items` son los ids de la tabla `entrega_items` (el campo `id` de cada elemento de `entrega_items`), **no** los ids de las prendas.

### Respuesta 200

```json
{
  "entrega_id": 4,
  "estado": "cerrada",
  "comprados": 1,
  "devueltos": 1,
  "total_comprado": 45000.0
}
```

### Errores (se revisan en este orden)

| Código | Cuándo | Mensaje |
| --- | --- | --- |
| 405 | El método no es PUT | `Usá PUT para confirmar una entrega` |
| 400 | Falta `entrega_id` o `items`, `entrega_id` no es un número, o `items` no es una lista | `Faltan entrega_id o items` |
| 404 | La entrega no existe | `No existe esa entrega` |
| 409 | La entrega ya estaba cerrada | `Esa entrega ya estaba cerrada` |
| 400 | Un ítem de `items` no pertenece a esa entrega, no está en prueba, o no es un número | `El ítem N no pertenece a esta entrega` |
| 500 | Falló la base de datos | `No se pudo confirmar la entrega` |

---

## Resumen de códigos de estado usados

| Código | Significado en esta API |
| --- | --- |
| 200 | Salió bien (lectura o confirmación) |
| 201 | Se creó una entrega |
| 400 | El pedido está mal armado o no se puede cumplir (culpa de quien pide) |
| 401 | Falta el token o no sirve |
| 404 | La entrega, la clienta o la prenda no existen |
| 405 | Método HTTP no permitido en ese endpoint |
| 409 | Conflicto de estado: la entrega ya estaba cerrada |
| 500 | Falla del servidor o de la base de datos |