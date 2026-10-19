# App Cuenta Corriente

TP1 — Aplicaciones Móviles y Cloud Computing

---

## 1. Presentación

App web para una vendedora de ropa que trabaja con **cuenta corriente**: las clientas se llevan prendas a probar, después confirman cuáles compran y cuáles devuelven, y pagan en partes. La app lleva el registro de clientas, prendas, entregas, pagos y el **saldo** de cada una, y permite mandarle el resumen por WhatsApp.

- **URL pública:** https://reliable-spirit-production-e065.up.railway.app
- **API (ejemplo):** https://reliable-spirit-production-e065.up.railway.app/api/estado.php
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

### GET /api/pagos.php (protegido)
- **Para qué:** listar todos los pagos registrados de una clienta específica, ordenados del más reciente al más antiguo.
- **Recibe:** el id de la clienta por URL → `?cliente_id=1`.
- **Devuelve:** una lista de pagos → `[{"id": 1, "cliente_id": 1, "fecha": "2026-10-10 14:30:00", "monto": 20000.0, "medio": "efectivo", "observacion": "Seña inicial"}]`. Si no tiene pagos registrados, devuelve un array vacío `[]`.
- **Códigos:** 200 (bien; la lista puede venir vacía) · 400 (falta `cliente_id` o no es un número) · 401 (sin token o vencido) · 500 (falló la base).

### POST /api/pagos.php (protegido)
- **Para qué:** registrar un nuevo pago realizado por una clienta. Impacta de inmediato en el saldo de su cuenta corriente. 
- **Recibe:** id de la clienta, importe, medio de cobro y observación opcional → `{"cliente_id": 1, "monto": 25000.0, "medio": "transferencia", "observacion": "Pago parcial jeans"}`.
- **Devuelve:** el pago registrado con el saldo restante actualizado → `{"mensaje": "Pago registrado con éxito", "id": 5, "saldo_actual": 225000.0}`.
- **Códigos:** 201 (pago registrado) · 400 (faltan campos obligatorios, JSON mal formado o medio de pago inválido) · 401 (sin token o vencido) · 404 (la clienta no existe o está inactiva) · 422 (el monto es menor o igual a cero, o excede la deuda actual) · 500 (falló la base).

### GET /api/resumen.php (protegido)
- **Para qué:** calcular dinámicamente el estado de cuenta de una clienta (total comprado, total abonado y saldo actual), o listar todas las clientas que mantienen deuda activa.
- **Recibe:** por URL `?cliente_id={id}` para el resumen individual, o `?deudores=1` para listar deudoras.
- **Devuelve:** 
  - Con `?cliente_id=1` → `{"cliente_id": 1, "total_compras": 275000.0, "total_pagos": 50000.0, "saldo_actual": 225000.0}`.
  - Con `?deudores=1` → lista de clientas con saldo positivo `[{"id": 1, "nombre": "Marta Fernández", "saldo_actual": 225000.0}]`.
- **Códigos:** 200 (bien) · 400 (parámetro ausente o inválido) · 401 (sin token o vencido) · 404 (la clienta no existe) · 500 (falló la base).

_(Los demás integrantes agregan acá sus endpoints con este mismo formato.)_

---

## 4. Variables de entorno

La configuración se lee con `getenv()` en `api/config.php`. En el código **no hay ninguna contraseña ni clave real**: los valores de producción se cargan solo en el panel de Railway (pestaña *Variables* del servicio de la app). Si una variable no existe, se usa el valor local de XAMPP, por eso en local no hace falta configurar nada.

| Variable | Para qué sirve | En local (XAMPP) | En Railway |
|---|---|---|---|
| `DB_HOST` | Servidor de la base de datos | `localhost` | Referencia al servicio MySQL: `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | Puerto de MySQL | `3306` | `${{MySQL.MYSQLPORT}}` |
| `DB_NAME` | Nombre de la base | `cuenta_corriente` | `cuenta_corriente` (la crea `schema.sql`) |
| `DB_USER` | Usuario de MySQL | `root` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASS` | Contraseña de MySQL | _(vacía)_ | `${{MySQL.MYSQLPASSWORD}}` |
| `CORS_ORIGEN` | Única dirección desde la que el navegador puede llamar a la API (nunca `*`) | `http://localhost:5500` | La URL pública de la app |
| `APP_ENV` | Con el valor `produccion` se apaga `display_errors`: los errores van al log y no se muestran al visitante | `local` | `produccion` |

Las variables con `${{MySQL...}}` son **referencias**: Railway completa solo los datos de su propia base MySQL, así la contraseña nunca se copia a mano ni aparece en el código.

---

## 5. Servicios externos

_Geocodificación: API de Open-Meteo
- Para qué se usa: convertir la ciudad de una clienta en latitud y longitud para mostrarla en el mapa.
- Quién la llama: el backend, desde la función geocodificarCiudad() de api/servicios.php, que invoca clientes.php al crear o editar una clienta. El navegador nunca la llama.
- Qué datos salen:solamente el nombre de la ciudad. No se envía ningún dato personal de la clienta. No requiere clave de API para uso no comercial.
- Qué devuelve y cómo se usa: se piden varios resultados y se toma el primero de Argentina (código AR), porque hay ciudades con el mismo nombre en otros países.
- Qué pasa si falla:
  - Si el servicio responde pero no encuentra la ciudad, la API responde 422 y no guarda la clienta.
  - Si el servicio no responde (sin conexión, demora de más de 5 segundos o error del servidor), la clienta se guarda sin coordenadas y el error queda en el log del servidor.
  - Si la ciudad viene vacía, no se consulta nada y la clienta queda sin coordenadas.


#La ubicación es aproximada: Open-Meteo busca por nombre de lugar, no por calle y número, así que el punto del mapa es el de la ciudad y no el de la casa de la clienta.
Solo se aceptan ciudades de Argentina.
No hay forma de reactivar desde la API a una clienta o prenda dada de baja, y el DNI de una clienta dada de baja sigue ocupado.
La foto es solo una dirección de texto: la API no permite subir archivos de imagen.
Los listados no tienen paginación: devuelven todas las filas activas.

---

## 6. Despliegue

**Proveedor:** [Railway](https://railway.com), una plataforma **PaaS** (plataforma como servicio).

**Por qué PaaS y por qué Railway:** con PaaS solo entregamos nuestro código y nuestros datos; el proveedor se encarga del servidor, el sistema operativo, el certificado HTTPS y la red. Railway, además, permite tener la **app y la base MySQL en el mismo proyecto** (comunicadas por una red privada), maneja **variables de entorno** desde su panel y se conecta con GitHub. Lo recomendó la cátedra y no bloquea a clientes que no son navegadores, algo necesario para la app Android del TP N.º 2.

**Cómo está armado**

- **Servicio de la app:** se construye con el `Dockerfile` de la raíz, que arma un servidor igual a XAMPP (imagen `php:8.2-apache` + extensión `pdo_mysql`). La última línea (`CMD`) deja activo un solo módulo de trabajo de Apache (`mpm_prefork`, el que necesita PHP); sin ella, en Railway Apache no arrancaba (*More than one MPM loaded*).
- **`index.php` (raíz):** redirige a `frontend/`, así la URL pública lleva directo a la app (y de ahí al login).
- **Servicio MySQL:** base de Railway con su propio volumen de datos. Solo se accede por la red privada del proyecto; el acceso público se usó una sola vez para cargar los scripts y después se cerró.
- **Frontend y API en el mismo dominio**, por eso las direcciones a la API son relativas (`../api/...`) y no hay problemas de CORS.

**Pasos para volver a desplegar**

1. **Código:** el servicio de la app está conectado a la rama `main` de GitHub. Cada vez que se une algo a `main`, Railway vuelve a construir y desplegar solo (tarda un par de minutos). Si algo falla, el detalle está en *Deployments → Deploy Logs*.
2. **Desde cero** (proyecto nuevo):
   1. En Railway: *New Project → Deploy from GitHub repo* → este repositorio.
   2. En el mismo proyecto: *+ Add → Database → MySQL*.
   3. En el servicio de la app → *Variables* → cargar las de la sección 4.
   4. *Settings → Networking → Generate Domain* para obtener la dirección pública con HTTPS.
   5. Crear las tablas: habilitar temporalmente el acceso público de MySQL, conectarse con un cliente (por ejemplo HeidiSQL) usando los datos de `MYSQL_PUBLIC_URL`, ejecutar `sql/schema.sql` y después `sql/datos_prueba.sql`, y **volver a cerrar** el acceso público.
   6. Probar `/api/estado.php`: tiene que responder `{"api":"ok","base":"conectada",...}`.
3. **Cambios en la base:** si se agrega una columna o tabla, además de actualizar `schema.sql` hay que ejecutar el `ALTER TABLE` en la base de Railway (no se actualiza sola).

---

## 7. Limitaciones conocidas
- **Una entrega abierta no se puede editar ni cancelar desde la API:** solo se crea y se confirma.
- **La confirmación es de todo o nada:** se decide el destino de todas las prendas de la entrega a la vez.
- **Las entregas abiertas no vencen:** pueden quedar abiertas indefinidamente.
- **Plan de Railway:** usamos la prueba gratuita (30 días o US$5 de crédito). Para mantener el despliegue hasta el TP N.º 2 hay que pasar al plan Hobby.
- **Cambios en la base de la nube:** las modificaciones de `schema.sql` no se aplican solas en Railway; hay que ejecutarlas a mano.
- **Sin reversión de pagos:** un pago asentado no puede editarse ni eliminarse desde la API; requiere ajustes manuales o notas de crédito.
- **Sin saldo a favor ni imputación puntual:** los pagos impactan sobre la deuda global de la clienta (no se permite pagar más del saldo pendiente ni asociar un cobro a una entrega específica).
- **Sin comprobante automático por email:** la emisión y envío automático de comprobantes por correo queda diferida para la segunda entrega; el cobro se asienta y refleja directamente en el saldo de la app.

_(A completar al final, con lo que quedó sin hacer o funciona con alguna restricción.)_

---

## Decisiones de cada módulo

### Base, login y seguridad

- **Las contraseñas nunca se guardan en texto plano.** Se guardan con `password_hash()`, que las convierte en un texto irreversible. En el login se comparan con `password_verify()`. Si alguien llegara a ver la base, no podría saber las contraseñas.
- **Mismo mensaje de error** si el email no existe o la contraseña es incorrecta (`401 Email o contraseña incorrectos`), para no darle pistas a quien intente adivinar usuarios.
- **Token:** al iniciar sesión, la API crea un token de 64 caracteres al azar (`random_bytes`), lo guarda en la tabla `usuarios` y vence a las **8 horas**. El frontend lo guarda en `localStorage` y lo manda en cada pedido. `api/auth.php` lo revisa: si falta, es inválido o venció, corta con **401** y el endpoint no se ejecuta. Al cerrar sesión el token se borra de la base y deja de servir.
- **CORS y preflight:** antes de un pedido con token o con JSON, el navegador manda un pedido `OPTIONS` (el *preflight*) para preguntar si tiene permiso. `api/cors.php` responde **204** y solo autoriza el origen de `CORS_ORIGEN` (nunca `*`).
- **Consultas preparadas:** todas las consultas usan PDO con parámetros (`:email`, `:token`), así lo que escribe el usuario nunca se mezcla con el SQL (evita la inyección SQL).
- **Errores de conexión:** si la base no responde, `api/conexion.php` devuelve un JSON con **500** y guarda el detalle con `error_log()`, sin mostrarlo al usuario.


### Entregas y confirmación de compra
El contrato completo de estos endpoints está en docs/contrato_entregas.md.

- **Las prendas a prueba no suman al saldo.** Una prenda a prueba todavía no es una compra: la clienta puede devolverla. Por eso crear una entrega solo descuenta el stock y deja cada ítem en en_prueba, y no toca ningún saldo. Recién confirmar_entrega.php pasa un ítem a comprada, y en ese momento empieza a contar. Como el saldo se calcula sumando lo comprado y restando lo pagado, la deuda de una clienta solo puede subir por una decisión explícita de compra.
- **Transacción en los dos endpoints.** Crear una entrega son varios pasos (insertar la entrega, insertar cada ítem y descontar el stock de cada prenda), y confirmarla también (cambiar el estado de cada ítem, devolver stock y cerrar la entrega). Si uno fallara a la mitad, la base quedaría inconsistente: una entrega sin todas sus prendas, o stock descontado de algo que nunca se entregó. Con beginTransaction, commit y rollBack de PDO se guarda todo junto o no se guarda nada. Por ejemplo, una entrega con una prenda válida y otra inexistente responde 404 y el stock de la válida queda intacto.
- **El precio se guarda en cada ítem.** entrega_items.precio_unitario guarda el precio que tenía la prenda el día de la entrega. Si el catálogo cambia después, lo que la clienta debe no se modifica, porque el saldo se calcula con ese precio y no con el actual de productos.
- **El stock se revisa antes de guardar.** Si una prenda no tiene stock, la API responde 400 y no queda nada guardado. Al devolver una prenda, su unidad vuelve al stock.
- **Una entrega cerrada responde 409, no 400.** El pedido está bien armado; lo que lo impide es el estado actual de la entrega. Las validaciones de confirmar_entrega.php se hacen en este orden: cuerpo del pedido (400), entrega inexistente (404), entrega ya cerrada (409) e ítem ajeno a la entrega (400).
- **Consultas preparadas y errores controlados.** Todos los datos que llegan del cliente se usan como parámetros de PDO. Si la base falla, la respuesta es un 500 con un mensaje genérico y el detalle va a error_log().
- **Pantallas.** En «Inicio», el botón «Nueva Entrega» abre un formulario donde se elige la clienta, se buscan y agregan prendas del catálogo (solo las que tienen stock) y se ve el total a prueba; al guardar se llama a `POST entregas.php`. En cada entrega abierta, «Confirmar >» abre la lista de prendas con «Se queda / Devuelve» y el importe que se suma al saldo; al confirmar se llama a `PUT confirmar_entrega.php`. Si la API responde con un error (por ejemplo, una prenda sin stock o una entrega ya cerrada), el mensaje se muestra en rojo dentro del popup y este no se cierra. Si el token venció, se vuelve a la pantalla de login.


### Pagos y cuenta corriente

- **El saldo nunca se persiste en la base.** Siguiendo la regla de negocio, no existe una columna `saldo` en la tabla `clientes`. Se calcula siempre en tiempo real en `resumen.php` restando el total acumulado de pagos al total acumulado de compras confirmadas (`saldo = SUM(compras) - SUM(pagos)`). Esto evita inconsistencias si se confirman prendas nuevas, se corrigen precios o se procesan cobros simultáneos.
- **Manejo de nulos con `COALESCE`.** En las consultas SQL de agregación para el saldo, se utiliza `COALESCE(SUM(...), 0)`. De este modo, si una clienta recién registrada no tiene compras o aún no efectuó ningún pago, la base devuelve `0` numérico y no `NULL`, previniendo errores de cálculo o advertencias en PHP.
- **Validaciones estrictas de montos.** En `POST pagos.php` se valida que el importe sea numérico y estrictamente mayor a cero (`> 0`). Un monto negativo o nulo responde **422 Unprocessable Entity**. Además, se comprueba que la clienta exista y esté activa antes de registrar la operación.
- **Consultas preparadas y transacciones.** La inserción del cobro en la tabla `pagos` se ejecuta con PDO parametrizado (`:cliente_id`, `:monto`, `:medio`, `:observacion`) para prevenir inyecciones SQL.

### Diseño general del sitio

- El sitio web, que actua como interfaz entre el usuario y el api, esta casi completamente implementado desde **una sola pagina html**: index.html. Esta misma teniendo dentro de si **submenus** y **ventanas emergentes** implementadas desde JavaScript. Este diseño permite observar todos los datos del servidor y realizar cualquier cambio necesario sin necesitar en ningun momento cambiar de pagina.
- **Submenus:** La pagina permite a traves de JavaScript observar 3 distintos **submenus**, accessibles desde el menu de navegacion en el footer, siendo estos menus: ***Inicio***, ***Clientes***, y ***Prendas***. Cada uno de los submenus tiene como rol mostrar la informacion basica de sus endpoints relacionados, con botones para indagar mas a fondo.
- **Ventas Emergentes:** La edicion/creacion de datos en su gran mayoria se encuentra detras de **ventanas emergentes**, accessibles desde los varios botones presentes en los submenus del sitio. Este modelo de ventanas emergentes permite mantener los **menus principales limpios**, moviendo muchos formularios de ingreso de datos e informacion especifica hacia lugares mas apropiados, sin la necesidad de crear una pagina nueva.
- **Modelo AJAX:** Todos los menus y ventanas obtienen su informacion a traves de solicitudes realizadas en JavaScript de forma asincronica, con las regulaciones y manejo de errores necesarios. Esto permite que el sitio tenga un modelo de funcionamiento AJAX, donde la pagina no necesita recargarse para obtener informacion del servidor.


_(Cada integrante agrega acá un apartado con las decisiones de su módulo.)_
