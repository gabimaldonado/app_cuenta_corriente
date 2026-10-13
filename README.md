# App Cuenta Corriente

TP1 — Aplicaciones Móviles y Cloud Computing

---

## 1. Presentación

App web para una vendedora de ropa que trabaja con **cuenta corriente**: las clientas se llevan prendas a probar, después confirman cuáles compran y cuáles devuelven, y pagan en partes. La app lleva el registro de clientas, prendas, entregas, pagos y el **saldo** de cada una, y permite mandarle el resumen por WhatsApp.

- **URL pública:** _(a completar cuando esté desplegada)_
- **Usuario de prueba:**
  - Email: `admin@cuentacorriente.com`
  - Contraseña: `admin123`

**Integrantes**

| Integrante | Módulo |
|---|---|
| 1 · Gabriela | Base de datos, login, seguridad y despliegue |
| 2 · Liliana | Clientes, catálogo de prendas y geocodificación |
| 3 · Juliana | Entregas a prueba y confirmación de compra |
| 4 · Tomás | Pagos y cuenta corriente |
| 5 · Tadeo | Interfaz común, WhatsApp, mapa y pruebas |

---

## 2. Cómo correrla en local

**Se necesita:** XAMPP (Apache y MySQL) y un navegador.

1. Clonar el repositorio dentro de `C:\xampp\htdocs`, así queda la carpeta `C:\xampp\htdocs\app_cuenta_corriente`.
2. Abrir XAMPP e iniciar **Apache** y **MySQL**.
3. Entrar a `http://localhost/phpmyadmin` → pestaña **Importar** e importar, **en este orden**:
   1. `sql/schema.sql` (crea la base `cuenta_corriente` y las 6 tablas)
   2. `sql/datos_prueba.sql` (carga el usuario de prueba, clientas, prendas, entregas y pagos)
4. Probar que la API conecta con la base: `http://localhost/app_cuenta_corriente/api/estado.php`
   Tiene que responder `{"api":"ok","base":"conectada","clientes":4}`.
5. Abrir la app: `http://localhost/app_cuenta_corriente/frontend/login.html` y entrar con el usuario de prueba.

No hace falta configurar nada: si no hay variables de entorno, `api/config.php` usa los valores normales de XAMPP (usuario `root` sin contraseña).

**Base de datos**

- El script completo está en `sql/schema.sql` y el diagrama entidad-relación en `docs/diagrama_er.JPG`.
- Tablas: `usuarios`, `clientes`, `productos`, `entregas`, `entrega_items` y `pagos`.
- El **saldo no se guarda**: se calcula cada vez sumando lo comprado y restando lo pagado, así nunca queda desactualizado.

---

## 3. Endpoints

Todas las respuestas son JSON.
Los endpoints marcados como **protegido** necesitan el token (se obtiene con `login.php`).
Se manda en el encabezado `Authorization: Bearer <token>`. Sin token válido responden **401**.

### POST /api/login.php
- **Para qué:** iniciar sesión.
- **Recibe:** email y contraseña → `{"email": "...", "password": "..."}`
- **Devuelve:** el token y el nombre → `{"token": "...", "nombre": "..."}`
- **Códigos:** 200 (bien) · 400 (faltan datos) · 401 (email o contraseña incorrectos) · 405 (no se usó POST)

### GET /api/sesion.php (protegido)
- **Para qué:** saber si la sesión sigue activa y de quién es.
- **Devuelve:** `{"id": 1, "nombre": "...", "email": "..."}`
- **Códigos:** 200 (sesión válida) · 401 (sin token o vencido)

### DELETE /api/sesion.php (protegido)
- **Para qué:** cerrar sesión (borra el token de la base).
- **Devuelve:** nada.
- **Códigos:** 204 (sesión cerrada) · 401 (sin token o vencido)

### GET /api/estado.php
- **Para qué:** comprobar que la API está viva y conectada a la base.
- **Devuelve:** `{"api": "ok", "base": "conectada", "clientes": 4}`
- **Códigos:** 200 (todo bien) · 500 (no hay conexión con la base)

### GET /api/entregas.php (protegido)
- **Para qué:** listar las entregas a prueba, cada una con sus prendas. Con ?id= devuelve una sola entrega, con ?cliente_id= las de una clienta y con ?estado= (abierta o cerrada) las de ese estado.
- **Recibe:** nada en el cuerpo; los filtros van en la URL.
- **Devuelve:** una lista de entregas → [{"id": 2, "cliente_id": 2, "fecha": "2026-09-28 17:00:00", "estado": "abierta", "entrega_items": [{"id": 6, "entrega_id": 2, "producto_id": 6, "precio_unitario": 35000.0, "estado": "en_prueba"}]}]. Con ?id= devuelve un solo objeto, sin la lista.
- **Códigos:** 200 (bien; la lista puede venir vacía) · 401 (sin token o vencido) · 404 (?id= de una entrega que no existe)

### POST /api/entregas.php (protegido)
- **Para qué:** crear una entrega: la clienta se lleva prendas a probar. Descuenta una unidad del stock por cada prenda y no modifica ningún saldo.
- **Recibe:** el id de la clienta y los ids de las prendas → {"cliente_id": 1, "productos": [1, 2]}
- **Devuelve:** la entrega creada → {"id": 4, "cliente_id": 1, "estado": "abierta"}
- **Códigos:** 201 (entrega creada) · 400 (faltan datos, clienta dada de baja, prenda sin stock o id de prenda que no es un número) · 401 (sin token o vencido) · 404 (la clienta o una prenda no existen) · 500 (falló la base)

### PUT /api/confirmar_entrega.php (protegido)
- **Para qué:** cerrar una entrega. Las prendas indicadas pasan a comprada, todas las demás pasan a devuelta y vuelven al stock, y la entrega queda cerrada.
- **Recibe:** el id de la entrega y los ids de los ítems que la clienta se queda → {"entrega_id": 4, "items": [10]}. Son ids de entrega_items, no de las prendas. Si devuelve todo, items va vacío ([]).
- **Devuelve:** el resultado → {"entrega_id": 4, "estado": "cerrada", "comprados": 1, "devueltos": 1, "total_comprado": 45000.0}
- **Códigos:** 200 (entrega cerrada) · 400 (faltan datos o un ítem no pertenece a esa entrega) · 401 (sin token o vencido) · 404 (la entrega no existe) · 405 (no se usó PUT) · 409 (la entrega ya estaba cerrada) · 500 (falló la base)

_(Los demás integrantes agregan acá sus endpoints con este mismo formato.)_

---

## 4. Variables de entorno

La configuración se lee con `getenv()` en `api/config.php`. En el código **no hay ninguna contraseña real**: los valores de producción se cargan solo en el panel del proveedor de hosting. Si una variable no existe, se usa el valor local de XAMPP.

| Variable | Para qué sirve | Valor por defecto (local) |
|---|---|---|
| `DB_HOST` | Servidor de la base de datos | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_NAME` | Nombre de la base | `cuenta_corriente` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASS` | Contraseña de MySQL | _(vacía)_ |
| `CORS_ORIGEN` | Única dirección desde la que el navegador puede llamar a la API | `http://localhost:5500` |
| `APP_ENV` | Con el valor `produccion` se apaga `display_errors`, para no mostrar errores internos | `local` |

_(Si se usa el aviso por email, agregar `RESEND_API_KEY`.)_

---

## 5. Servicios externos

_(A completar: geocodificación con Open-Meteo y mapa con Leaflet + OpenStreetMap. Para cada uno: quién lo llama, qué datos salen y qué pasa si falla.)_

---

## 6. Despliegue

_(A completar cuando la app esté en la nube: proveedor, por qué se eligió y pasos para volver a desplegar.)_

---

## 7. Limitaciones conocidas
- **Una entrega abierta no se puede editar ni cancelar desde la API:** solo se crea y se confirma.
- **La confirmación es de todo o nada:** se decide el destino de todas las prendas de la entrega a la vez.
- **Las entregas abiertas no vencen:** pueden quedar abiertas indefinidamente.

_(A completar al final, con lo que quedó sin hacer o funciona con alguna restricción.)_

---

## Decisiones de cada módulo

- **Pantallas.** En «Inicio», el botón «Nueva Entrega» abre un formulario donde se elige la clienta, se buscan y agregan prendas del catálogo (solo las que tienen stock) y se ve el total a prueba; al guardar se llama a `POST entregas.php`. En cada entrega abierta, «Confirmar >» abre la lista de prendas con «Se queda / Devuelve» y el importe que se suma al saldo; al confirmar se llama a `PUT confirmar_entrega.php`. Si la API responde con un error (por ejemplo, una prenda sin stock o una entrega ya cerrada), el mensaje se muestra en rojo dentro del popup y este no se cierra. Si el token venció, se vuelve a la pantalla de login.

### Base, login y seguridad

- **Las contraseñas nunca se guardan en texto plano.** Se guardan con `password_hash()`, que las convierte en un texto irreversible. En el login se comparan con `password_verify()`. Si alguien llegara a ver la base, no podría saber las contraseñas.
- **Mismo mensaje de error** si el email no existe o la contraseña es incorrecta (`401 Email o contraseña incorrectos`), para no darle pistas a quien intente adivinar usuarios.
- **Token:** al iniciar sesión, la API crea un token de 64 caracteres al azar (`random_bytes`), lo guarda en la tabla `usuarios` y vence a las **8 horas**. El frontend lo guarda en `localStorage` y lo manda en cada pedido. `api/auth.php` lo revisa: si falta, es inválido o venció, corta con **401** y el endpoint no se ejecuta. Al cerrar sesión el token se borra de la base y deja de servir.
- **CORS y preflight:** antes de un pedido con token o con JSON, el navegador manda un pedido `OPTIONS` (el *preflight*) para preguntar si tiene permiso. `api/cors.php` responde **204** y solo autoriza el origen de `CORS_ORIGEN` (nunca `*`).
- **Consultas preparadas:** todas las consultas usan PDO con parámetros (`:email`, `:token`), así lo que escribe el usuario nunca se mezcla con el SQL (evita la inyección SQL).
- **Errores de conexión:** si la base no responde, `api/conexion.php` devuelve un JSON con **500** y guarda el detalle con `error_log()`, sin mostrarlo al usuario.


### Entregas y confirmación de compra
El contrato completo de estos endpoints está en docs/contrato_entregas.md.

-- **Las prendas a prueba no suman al saldo.** Una prenda a prueba todavía no es una compra: la clienta puede devolverla. Por eso crear una entrega solo descuenta el stock y deja cada ítem en en_prueba, y no toca ningún saldo. Recién confirmar_entrega.php pasa un ítem a comprada, y en ese momento empieza a contar. Como el saldo se calcula sumando lo comprado y restando lo pagado, la deuda de una clienta solo puede subir por una decisión explícita de compra.
-- **Transacción en los dos endpoints.** Crear una entrega son varios pasos (insertar la entrega, insertar cada ítem y descontar el stock de cada prenda), y confirmarla también (cambiar el estado de cada ítem, devolver stock y cerrar la entrega). Si uno fallara a la mitad, la base quedaría inconsistente: una entrega sin todas sus prendas, o stock descontado de algo que nunca se entregó. Con beginTransaction, commit y rollBack de PDO se guarda todo junto o no se guarda nada. Por ejemplo, una entrega con una prenda válida y otra inexistente responde 404 y el stock de la válida queda intacto.
-- **El precio se guarda en cada ítem.** entrega_items.precio_unitario guarda el precio que tenía la prenda el día de la entrega. Si el catálogo cambia después, lo que la clienta debe no se modifica, porque el saldo se calcula con ese precio y no con el actual de productos.
-- **El stock se revisa antes de guardar.** Si una prenda no tiene stock, la API responde 400 y no queda nada guardado. Al devolver una prenda, su unidad vuelve al stock.
-- **Una entrega cerrada responde 409, no 400.** El pedido está bien armado; lo que lo impide es el estado actual de la entrega. Las validaciones de confirmar_entrega.php se hacen en este orden: cuerpo del pedido (400), entrega inexistente (404), entrega ya cerrada (409) e ítem ajeno a la entrega (400).
-- **Consultas preparadas y errores controlados.** Todos los datos que llegan del cliente se usan como parámetros de PDO. Si la base falla, la respuesta es un 500 con un mensaje genérico y el detalle va a error_log().
-- **Pantallas:** [COMPLETAR cuando estén conectadas: cómo se usan «Nueva entrega» y «Confirmar compra» y cómo se muestran al usuario los errores de la API.]

### Diseño general del sitio

- El sitio web, que actua como interfaz entre el usuario y el api, esta casi completamente implementado desde **una sola pagina html**: index.html. Esta misma teniendo dentro de si **submenus** y **ventanas emergentes** implementadas desde JavaScript. Este diseño permite observar todos los datos del servidor y realizar cualquier cambio necesario sin necesitar en ningun momento cambiar de pagina.
- **Submenus:** La pagina permite a traves de JavaScript observar 3 distintos **submenus**, accessibles desde el menu de navegacion en el footer, siendo estos menus: ***Inicio***, ***Clientes***, y ***Prendas***. Cada uno de los submenus tiene como rol mostrar la informacion basica de sus endpoints relacionados, con botones para indagar mas a fondo.
- **Ventas Emergentes:** La edicion/creacion de datos en su gran mayoria se encuentra detras de **ventanas emergentes**, accessibles desde los varios botones presentes en los submenus del sitio. Este modelo de ventanas emergentes permite mantener los **menus principales limpios**, moviendo muchos formularios de ingreso de datos e informacion especifica hacia lugares mas apropiados, sin la necesidad de crear una pagina nueva.
- **Modelo AJAX:** Todos los menus y ventanas obtienen su informacion a traves de solicitudes realizadas en JavaScript de forma asincronica, con las regulaciones y manejo de errores necesarios. Esto permite que el sitio tenga un modelo de funcionamiento AJAX, donde la pagina no necesita recargarse para obtener informacion del servidor.


_(Cada integrante agrega acá un apartado con las decisiones de su módulo.)_