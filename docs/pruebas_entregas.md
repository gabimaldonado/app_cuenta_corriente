# Pruebas — Entregas a prueba

Módulo del integrante 3. Todas las pruebas se hacen en Postman contra
`http://localhost/app_cuenta_corriente/api/`.

Columnas: **Esperado** es lo que tiene que responder la API. **Obtenido** se completa al probar.

## Antes de empezar

1. Hacé login (`POST login.php`) y pegá el token en **Authorization → Bearer Token** de cada pestaña. El token dura 8 horas.
2. En phpMyAdmin (tabla `productos`, pestaña Examinar) anotá el stock actual de las prendas 1, 2 y 3:
   - Prenda 1: 4
   - Prenda 2: 8
   - Prenda 3: 5
3. Creá **dos entregas nuevas** con el caso E13 (cliente 1, prendas `[1, 2]`). Anotá en phpMyAdmin (tabla `entrega_items`) el id de la entrega y los ids de sus dos ítems:
   - Entrega A: id 13 , ítems 7 y 1 (se usa en C7)
   - Entrega B: id 14 , ítems 7 y 2 (se usa en C8)
4. **No confirmes la entrega 2**: se deja abierta para probar las pantallas.

> Las pruebas de los casos E13, C7 y C8 modifican datos. Los ids de la base pueden saltear números después de un error; es normal.

---

## `entregas.php`

| N.º | Qué se prueba | Pedido | Esperado | Obtenido |
| --- | --- | --- | --- | --- |
| E1 | Sin token | GET `entregas.php`, Authorization en *No Auth* | **401** `Falta el token. Iniciá sesión.` |"error": "Falta el token. Iniciá sesión." |
| E2 | Lista completa | GET `entregas.php` | **200**, lista; cada entrega con `entrega_items` | [
    {
        "id": 7,
        "cliente_id": 1,
        "fecha": "2026-10-12 15:20:17",
        "estado": "abierta",
        "entrega_items": [
            {
                "id": 13,
                "entrega_id": 7,
                "producto_id": 1,
                "precio_unitario": 45000,
                "estado": "en_prueba"
            },
            {
                "id": 14,
                "entrega_id": 7,
                "producto_id": 2,
                "precio_unitario": 15000,
                "estado": "en_prueba"
            }
        ]
    },
    {
        "id": 4,
        "cliente_id": 1,
        "fecha": "2026-10-10 17:05:17",
        "estado": "cerrada",
        "entrega_items": [
            {
                "id": 10,
                "entrega_id": 4,
                "producto_id": 1,
                "precio_unitario": 45000,
                "estado": "comprada"
            },
            {
                "id": 11,
                "entrega_id": 4,
                "producto_id": 2,
                "precio_unitario": 15000,
                "estado": "devuelta"
            }
        ]
    },
    {
        "id": 2,
        "cliente_id": 2,
        "fecha": "2026-09-28 17:00:00",
        "estado": "abierta",
        "entrega_items": [
            {
                "id": 6,
                "entrega_id": 2,
                "producto_id": 6,
                "precio_unitario": 35000,
                "estado": "en_prueba"
            },
            {
                "id": 7,
                "entrega_id": 2,
                "producto_id": 7,
                "precio_unitario": 30000,
                "estado": "en_prueba"
            }
        ]
    },
    {
        "id": 1,
        "cliente_id": 1,
        "fecha": "2026-09-20 10:30:00",
        "estado": "cerrada",
        "entrega_items": [
            {
                "id": 1,
                "entrega_id": 1,
                "producto_id": 1,
                "precio_unitario": 45000,
                "estado": "comprada"
            },
            {
                "id": 2,
                "entrega_id": 1,
                "producto_id": 2,
                "precio_unitario": 15000,
                "estado": "devuelta"
            },
            {
                "id": 3,
                "entrega_id": 1,
                "producto_id": 3,
                "precio_unitario": 18000,
                "estado": "devuelta"
            },
            {
                "id": 4,
                "entrega_id": 1,
                "producto_id": 4,
                "precio_unitario": 65000,
                "estado": "comprada"
            },
            {
                "id": 5,
                "entrega_id": 1,
                "producto_id": 5,
                "precio_unitario": 80000,
                "estado": "devuelta"
            }
        ]
    },
    {
        "id": 3,
        "cliente_id": 3,
        "fecha": "2026-09-15 12:00:00",
        "estado": "cerrada",
        "entrega_items": [
            {
                "id": 8,
                "entrega_id": 3,
                "producto_id": 8,
                "precio_unitario": 55000,
                "estado": "comprada"
            },
            {
                "id": 9,
                "entrega_id": 3,
                "producto_id": 2,
                "precio_unitario": 15000,
                "estado": "comprada"
            }
        ]
    }
] |
| E3 | Una entrega | GET `entregas.php?id=2` | **200**, un objeto (llaves, no corchetes) con los ítems 6 y 7 | {
    "id": 2,
    "cliente_id": 2,
    "fecha": "2026-09-28 17:00:00",
    "estado": "abierta",
    "entrega_items": [
        {
            "id": 6,
            "entrega_id": 2,
            "producto_id": 6,
            "precio_unitario": 35000,
            "estado": "en_prueba"
        },
        {
            "id": 7,
            "entrega_id": 2,
            "producto_id": 7,
            "precio_unitario": 30000,
            "estado": "en_prueba"
        }
    ]
} |
| E4 | Entrega inexistente | GET `entregas.php?id=9999` | **404** `No existe esa entrega` | {"error": "No existe esa entrega"} |
| E5 | Por clienta | GET `entregas.php?cliente_id=2` | **200**, solo entregas de la clienta 2 | [
    {
        "id": 2,
        "cliente_id": 2,
        "fecha": "2026-09-28 17:00:00",
        "estado": "abierta",
        "entrega_items": [
            {
                "id": 6,
                "entrega_id": 2,
                "producto_id": 6,
                "precio_unitario": 35000,
                "estado": "en_prueba"
            },
            {
                "id": 7,
                "entrega_id": 2,
                "producto_id": 7,
                "precio_unitario": 30000,
                "estado": "en_prueba"
            }
        ]
    }
] |
| E6 | Clienta sin entregas | GET `entregas.php?cliente_id=9999` | **200** y lista vacía `[]` | [] |
| E7 | Cuerpo vacío | POST `{}` | **400** `Faltan cliente_id o productos` | {"error": "Faltan cliente_id o productos"} |
| E8 | Lista de prendas vacía | POST `{"cliente_id": 1, "productos": []}` | **400** `Faltan cliente_id o productos` | {
    "error": "Faltan cliente_id o productos"} |
| E9 | Clienta inexistente | POST `{"cliente_id": 9999, "productos": [1]}` | **404** `No existe esa clienta` | {
    "error": "No existe esa clienta"} |
| E10 | Prenda inexistente | POST `{"cliente_id": 1, "productos": [9999]}` | **404** `No existe la prenda con id 9999` | {
    "error": "No existe la prenda con id 9999"} |
| E11 | Una prenda buena y una inexistente (transacción) | POST `{"cliente_id": 1, "productos": [1, 9999]}` | **404**. El stock de la prenda 1 **no cambió** y no apareció ninguna entrega nueva | {"error": "No existe la prenda con id 9999"} |
| E12 | Prenda sin stock | Ver abajo | **400** `No hay stock de la prenda con id 3`. El stock de la prenda 1 **no cambió** y no hay entrega nueva | {"error": "No hay stock de la prenda con id 3"} |
| E13 | Entrega válida | POST `{"cliente_id": 1, "productos": [1, 2]}` | **201** con `id`, `cliente_id` y `"estado": "abierta"`. Stock de las prendas 1 y 2 baja 1 cada uno; hay 2 ítems `en_prueba` | {"id": 12,"cliente_id": 1,"estado": abierta"} |
| E14 | Prenda que no es un número | POST `{"cliente_id": 1, "productos": ["abc"]}` | **400** `Cada prenda tiene que ser un número de id`, sin entrega nueva | {"error": "Cada prenda tiene que ser un número de id"} |
| E15 | Método no permitido | DELETE `entregas.php` | **405** `Método no permitido` | {"error": "Método no permitido"} |

**Cómo hacer E12:** en phpMyAdmin, tabla `productos`, tocá *Editar* en la prenda 3, poné `stock` en `0` y guardá. Mandá POST `{"cliente_id": 1, "productos": [1, 3]}`. Al terminar, **devolvé el stock de la prenda 3 al valor que anotaste** al principio.

**Cómo comprobar que "no cambió nada" (E11, E12, E14):** mirá en phpMyAdmin que la tabla `entregas` no tenga una fila más que antes y que el stock de la prenda 1 sea el mismo.

---

## `confirmar_entrega.php`

| N.º | Qué se prueba | Pedido | Esperado | Obtenido |
| --- | --- | --- | --- | --- |
| C1 | Sin token | PUT con Authorization en *No Auth* | **401** `Falta el token. Iniciá sesión.` | {"error": "Falta el token. Iniciá sesión."} |
| C2 | Método equivocado | GET `confirmar_entrega.php` | **405** `Usá PUT para confirmar una entrega` | {
    "error": "Usá PUT para confirmar una entrega"} |
| C3 | Falta `entrega_id` | PUT `{"items": []}` | **400** `Faltan entrega_id o items` | {"error": "Faltan entrega_id o items"
} |
| C4 | Falta `items` | PUT `{"entrega_id": 1}` | **400** `Faltan entrega_id o items` | {"error": "Faltan entrega_id o items"
} |
| C5 | Entrega inexistente | PUT `{"entrega_id": 9999, "items": []}` | **404** `No existe esa entrega` | {
    "error": "No existe esa entrega"} |
| C6 | Entrega ya cerrada | PUT `{"entrega_id": 1, "items": []}` | **409** `Esa entrega ya estaba cerrada` | {
    "error": "Esa entrega ya estaba cerrada"} |
| C7 | Ítem de otra entrega | PUT `{"entrega_id": A, "items": [6]}` (el ítem 6 es de la entrega 2) | **400** `El ítem 6 no pertenece a esta entrega`. La entrega A sigue `abierta` | {"error": "El ítem 6 no pertenece a esta entrega"} |
| C8 | Devuelve todo | PUT `{"entrega_id": A, "items": []}` | **200**, `"comprados": 0`, `"devueltos": 2`, `"total_comprado": 0`. Los 2 ítems quedan `devuelta`, el stock de ambas prendas vuelve al valor original, la entrega queda `cerrada` | {
    "entrega_id": 7,
    "estado": "cerrada",
    "comprados": 0,
    "devueltos": 2,
    "total_comprado": 0
} |
| C9 | Se queda una y devuelve otra | PUT `{"entrega_id": B, "items": [ítem de la prenda 1]}` | **200**, `"comprados": 1`, `"devueltos": 1`, `"total_comprado"` igual al precio de la prenda 1. Un ítem `comprada`, otro `devuelta`; el stock de la devuelta sube 1; entrega `cerrada` | |
| C10 | Repetir la confirmación | El mismo pedido de C9 | **409** `Esa entrega ya estaba cerrada` | {
    "error": "Esa entrega ya estaba cerrada"} |

Reemplazá **A** y **B** por los ids de las entregas que anotaste antes.

---

## Comprobación final: el saldo no se toca al crear una entrega

Esta prueba se hace junto con el integrante 4 cuando `resumen.php` esté disponible:

1. Pedir el saldo de una clienta.
2. Crear una entrega para esa clienta (E13).
3. Volver a pedir el saldo: **tiene que ser el mismo**.
4. Confirmar la entrega quedándose con una prenda (C9).
5. Pedir el saldo otra vez: **tiene que haber subido exactamente el precio de esa prenda**.

| Paso | Saldo obtenido |
| --- | --- |
| Antes de crear la entrega | |
| Después de crearla | |
| Después de confirmarla | |

---

## Resumen

| | Total de casos | Pasaron | Fallaron |
| --- | --- | --- | --- |
| `entregas.php` | 15 | 15 | 0 |
| `confirmar_entrega.php` | 10 | 9 | 1 |
