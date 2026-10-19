# App Cuenta Corriente

TP1 — Aplicaciones Móviles y Cloud Computing

---

## 1. Presentación

App web para una vendedora de ropa que trabaja con **cuenta corriente**: las clientas se llevan prendas a probar, después confirman cuáles compran y cuáles devuelven, y pagan en partes. La app lleva el registro de clientas, prendas, entregas, pagos y el **saldo** de cada una. El envío del resumen por WhatsApp queda para la próxima entrega (ver Limitaciones).

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

### GET /api/clientes.php (protegido)
- **Para qué:** listar las clientas activas, ordenadas por nombre. Con `?id=` devuelve una sola y con `?buscar=` filtra por nombre o DNI.
- **Recibe:** nada en el cuerpo; los filtros van en la URL.
- **Devuelve:** una lista de clientas → `[{"id": 1, "nombre": "Laura Gómez", "telefono": "5492914000001", "dni": "30111222", "direccion": "Belgrano 123", "ciudad": "Bahía Blanca", "notas": "Prefiere talle M", "latitud": -38.7183, "longitud": -62.2663, "activo": 1}]`. Con `?id=` devuelve un solo objeto.
- **Códigos:** 200 (bien; la lista puede venir vacía) · 400 (`?id=` que no es un número) · 401 (sin token o vencido) · 404 (`?id=` de una clienta que no existe o está dada de baja)

### POST /api/clientes.php (protegido)
- **Para qué:** dar de alta una clienta. Si tiene ciudad, el backend busca sus coordenadas con Open-Meteo (sección 5).
- **Recibe:** `{"nombre": "Ana Pérez", "telefono": "5492914000009", "dni": "40111222", "direccion": "Mitre 50", "ciudad": "Tandil", "notas": ""}`. Son obligatorios el nombre y el teléfono (10 a 15 dígitos, con código de país, como lo pide WhatsApp). El DNI es opcional, pero si viene tiene que tener 7 u 8 dígitos y no estar repetido.
- **Devuelve:** la clienta creada, con su `id`, `latitud` y `longitud`.
- **Códigos:** 201 (clienta creada) · 400 (faltan datos, teléfono o DNI inválidos, DNI repetido o un campo demasiado largo) · 401 (sin token o vencido) · 422 (no se encontró la ciudad) · 500 (falló la base)

### PUT /api/clientes.php?id= (protegido)
- **Para qué:** modificar los datos de una clienta. Si la ciudad no cambió, conserva las coordenadas que ya tenía y no vuelve a consultar Open-Meteo.
- **Recibe:** los mismos datos que el POST.
- **Devuelve:** la clienta actualizada.
- **Códigos:** 200 (bien) · 400 (mismas validaciones que el POST) · 401 (sin token o vencido) · 404 (la clienta no existe) · 422 (no se encontró la ciudad) · 500 (falló la base)

### DELETE /api/clientes.php?id= (protegido)
- **Para qué:** dar de baja una clienta. Es un borrado lógico: queda con `activo = 0` y deja de aparecer en los listados, pero sus entregas y pagos se conservan.
- **Devuelve:** nada.
- **Códigos:** 204 (dada de baja) · 400 (falta el id o no es un número) · 401 (sin token o vencido) · 404 (la clienta no existe)

### GET /api/productos.php (protegido)
- **Para qué:** listar las prendas activas del catálogo. Con `?id=` devuelve una sola, con `?buscar=` busca en descripción, talle o color, y con `?stock=con` o `?stock=sin` filtra por stock. Los filtros se pueden combinar.
- **Recibe:** nada en el cuerpo; los filtros van en la URL.
- **Devuelve:** una lista de prendas → `[{"id": 1, "descripcion": "Jean recto", "talle": "38", "color": "Azul", "precio": 45000.0, "stock": 5, "foto": null, "activo": 1}]`. Con `?id=` devuelve un solo objeto.
- **Códigos:** 200 (bien; la lista puede venir vacía) · 400 (`?stock=` con un valor que no es `con` ni `sin`, o `?id=` que no es un número) · 401 (sin token o vencido) · 404 (`?id=` de una prenda que no existe)

### POST /api/productos.php (protegido)
- **Para qué:** agregar una prenda al catálogo.
- **Recibe:** `{"descripcion": "Jean recto", "talle": "38", "color": "Azul", "precio": 45000, "stock": 5, "foto": ""}`. Son obligatorios la descripción, el talle y el color; el precio y el stock tienen que ser números mayores o iguales a 0 (el stock, entero). La foto es opcional (una dirección de texto).
- **Devuelve:** la prenda creada, con su `id`.
- **Códigos:** 201 (prenda creada) · 400 (faltan datos, precio o stock inválidos o un campo demasiado largo) · 401 (sin token o vencido) · 500 (falló la base)

### PUT /api/productos.php?id= (protegido)
- **Para qué:** modificar una prenda (por ejemplo, cambiar el precio o reponer stock).
- **Recibe:** los mismos datos que el POST.
- **Devuelve:** la prenda actualizada.
- **Códigos:** 200 (bien) · 400 (mismas validaciones que el POST) · 401 (sin token o vencido) · 404 (la prenda no existe) · 500 (falló la base)

### DELETE /api/productos.php?id= (protegido)
- **Para qué:** dar de baja una prenda. Es un borrado lógico (`activo = 0`): deja de aparecer en el catálogo, pero las entregas donde figura no se modifican.
- **Devuelve:** `{"mensaje": "Prenda dada de baja"}`
- **Códigos:** 200 (dada de baja) · 400 (falta el id o no es un número) · 401 (sin token o vencido) · 404 (la prenda no existe)

### GET /api/entregas.php (protegido)
- **Para qué:** listar las entregas a prueba, cada una con sus prendas. Con `?id=` devuelve una sola entrega, con `?cliente_id=` las de una clienta y con `?estado=` (`abierta` o `cerrada`) las de ese estado.
- **Recibe:** nada en el cuerpo; los filtros van en la URL.
- **Devuelve:** una lista de entregas → `[{"id": 2, "cliente_id": 2, "fecha": "2026-09-28 17:00:00", "estado": "abierta", "entrega_items": [{"id": 6, "entrega_id": 2, "producto_id": 6, "precio_unitario": 35000.0, "estado": "en_prueba"}]}]`. Con `?id=` devuelve un solo objeto, sin la lista.
- **Códigos:** 200 (bien; la lista puede venir vacía) · 401 (sin token o vencido) · 404 (`?id=` de una entrega que no existe)

### POST /api/entregas.php (protegido)
- **Para qué:** crear una entrega: la clienta se lleva prendas a probar. Descuenta una unidad del stock por cada prenda y no modifica ningún saldo.
- **Recibe:** el id de la clienta y los ids de las prendas → `{"cliente_id": 1, "productos": [1, 2]}`
- **Devuelve:** la entrega creada → `{"id": 4, "cliente_id": 1, "estado": "abierta"}`
- **Códigos:** 201 (entrega creada) · 400 (faltan datos, clienta dada de baja, prenda sin stock o id de prenda que no es un número) · 401 (sin token o vencido) · 404 (la clienta o una prenda no existen) · 500 (falló la base)

### PUT /api/confirmar_entrega.php (protegido)
- **Para qué:** cerrar una entrega. Las prendas indicadas pasan a `comprada`, todas las demás pasan a `devuelta` y vuelven al stock, y la entrega queda cerrada.
- **Recibe:** el id de la entrega y los ids de los ítems que la clienta se queda → `{"entrega_id": 4, "items": [10]}`. Son ids de `entrega_items`, no de las prendas. Si devuelve todo, `items` va vacío (`[]`).
- **Devuelve:** el resultado → `{"entrega_id": 4, "estado": "cerrada", "comprados": 1, "devueltos": 1, "total_comprado": 45000.0}`
- **Códigos:** 200 (entrega cerrada) · 400 (faltan datos o un ítem no pertenece a esa entrega) · 401 (sin token o vencido) · 404 (la entrega no existe) · 405 (no se usó PUT) · 409 (la entrega ya estaba cerrada) · 500 (falló la base)

### GET /api/pagos.php (protegido)
- **Para qué:** listar los pagos de una clienta, del más reciente al más antiguo.
- **Recibe:** nada en el cuerpo; el id de la clienta va en la URL → `?cliente_id=1`
- **Devuelve:** una lista de pagos → `[{"id": 1, "cliente_id": 1, "fecha": "2026-10-10 14:30:00", "monto": 20000.0, "medio": "efectivo", "observacion": "Seña inicial"}]`. Si no tiene pagos, devuelve una lista vacía (`[]`).
- **Códigos:** 200 (bien; la lista puede venir vacía) · 400 (falta `cliente_id` o no es un número) · 401 (sin token o vencido) · 500 (falló la base)

### POST /api/pagos.php (protegido)
- **Para qué:** registrar un pago de una clienta. Se descuenta de inmediato de su saldo.
- **Recibe:** el id de la clienta, el monto, el medio de pago y una observación opcional → `{"cliente_id": 1, "monto": 25000.0, "medio": "transferencia", "observacion": "Pago parcial jeans"}`
- **Devuelve:** el pago registrado y el saldo que queda → `{"mensaje": "Pago registrado con éxito", "id": 5, "saldo_actual": 225000.0}`
- **Códigos:** 201 (pago registrado) · 400 (faltan datos, JSON mal armado o medio de pago inválido) · 401 (sin token o vencido) · 404 (la clienta no existe o está dada de baja) · 422 (el monto es cero o negativo, o supera la deuda) · 500 (falló la base)

### GET /api/resumen.php (protegido)
- **Para qué:** calcular el estado de cuenta de una clienta (total comprado, total pagado y saldo), o listar las clientas que deben.
- **Recibe:** nada en el cuerpo; en la URL va `?cliente_id=1` para una clienta, o `?deudores=1` para listar las que deben.
- **Devuelve:**
  - Con `?cliente_id=1` → `{"cliente_id": 1, "total_compras": 275000.0, "total_pagos": 50000.0, "saldo_actual": 225000.0}`
  - Con `?deudores=1` → las clientas con saldo mayor a cero → `[{"id": 1, "nombre": "Marta Fernández", "saldo_actual": 225000.0}]`
- **Códigos:** 200 (bien) · 400 (falta el parámetro o no es válido) · 401 (sin token o vencido) · 404 (la clienta no existe) · 500 (falló la base)

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

### Geocodificación: Open-Meteo

- **Para qué se usa:** convertir la ciudad de una clienta en latitud y longitud, para mostrarla en el mapa.
- **Quién la llama:** el **backend**, con la función `geocodificarCiudad()` de `api/servicios.php`, que usa `clientes.php` al crear o editar una clienta. El navegador nunca la llama.
- **Qué datos salen:** solamente el nombre de la ciudad. No se envía ningún dato personal de la clienta. No necesita clave para uso no comercial.
- **Qué devuelve y cómo se usa:** se piden varios resultados y se toma el primero de Argentina (código `AR`), porque hay ciudades con el mismo nombre en otros países.
- **Qué pasa si falla:**
  - Si el servicio responde pero no encuentra la ciudad, la API responde **422** y no guarda la clienta.
  - Si el servicio no responde (sin conexión, demora de más de 5 segundos o error del servidor), la clienta **se guarda igual, sin coordenadas**, y el error queda en el log del servidor.
  - Si la ciudad viene vacía, no se consulta nada y la clienta queda sin coordenadas.

### Mapa de clientas: Leaflet + OpenStreetMap

- **Para qué se usa:** mostrar la latitud y longitud que devuelve la API como marcadores en un mapa interactivo, uno por clienta (al tocarlo se ve el nombre y la dirección).
- **Quién lo llama:** el **frontend**, al inicializar la ventana emergente del mapa (`popupMapaClientes` en `frontend/src/popups.js`).
- **Cómo se usa:**
  - **Leaflet** es la librería del mapa interactivo: permite poner marcadores con notas a partir de latitud y longitud. Se carga una sola vez, al abrir la página.
  - **OpenStreetMap** da las imágenes del mapa (los *tiles*), con las calles, edificios y relieve. Se piden a `tile.openstreetmap.org`.
- **Qué datos salen:** ningún dato de la app; solo los pedidos de las imágenes del mapa que Leaflet le hace a OpenStreetMap. Las coordenadas de las clientas se quedan en el navegador.
- **Atribución:** el mapa muestra «© OpenStreetMap», como lo piden sus condiciones de uso.
- **Qué pasa si falla:**
  - Si Leaflet no carga, el resto de la app funciona igual; la ventana del mapa muestra un error que indica que no se pudo cargar y sugiere recargar la página.
  - Si OpenStreetMap falla, el mapa o partes de él se ven en blanco, pero los marcadores siguen funcionando.
  - Las clientas sin coordenadas no se muestran; si no hay ninguna con ubicación, aparece el mensaje «No hay clientes con ubicación para mostrar».

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
- **Los pagos no se pueden corregir:** un pago registrado no se puede editar ni borrar desde la API; habría que corregirlo a mano en la base.
- **Sin saldo a favor ni pago por entrega:** los pagos se descuentan de la deuda total de la clienta; no se puede pagar más de lo que debe ni asociar un pago a una entrega en particular.
- **Sin comprobante por email:** el envío automático de comprobantes por correo queda para la segunda entrega; por ahora el pago solo se refleja en el saldo de la app.

- **Nombres repetidos:** se pueden cargar dos clientas con el mismo nombre; lo que no se repite es el DNI.
- **La ubicación es aproximada:** Open-Meteo busca por nombre de lugar, no por calle y número, así que el punto del mapa es el de la ciudad y no el de la casa de la clienta. Solo se aceptan ciudades de Argentina.
- **Las bajas no se pueden deshacer:** no hay forma de reactivar desde la API una clienta o prenda dada de baja, y el DNI de una clienta dada de baja sigue ocupado.
- **La foto es solo una dirección de texto:** la API no permite subir archivos de imagen.
- **Sin paginación:** los listados devuelven todas las filas activas.
- **WhatsApp:** el botón para mandarle el resumen a la clienta está en su ficha, pero todavía no envía nada; queda para la próxima entrega.

---

## 8. Decisiones de cada módulo

### Base, login y seguridad

- **Las contraseñas nunca se guardan en texto plano.** Se guardan con `password_hash()`, que las convierte en un texto irreversible. En el login se comparan con `password_verify()`. Si alguien llegara a ver la base, no podría saber las contraseñas.
- **Mismo mensaje de error.** Si el email no existe o la contraseña es incorrecta (`401 Email o contraseña incorrectos`), para no darle pistas a quien intente adivinar usuarios.
- **Token.** Al iniciar sesión, la API crea un token de 64 caracteres al azar (`random_bytes`), lo guarda en la tabla `usuarios` y vence a las **8 horas**. El frontend lo guarda en `localStorage` y lo manda en cada pedido. `api/auth.php` lo revisa: si falta, es inválido o venció, corta con **401** y el endpoint no se ejecuta. Al cerrar sesión el token se borra de la base y deja de servir.
- **CORS y preflight.** Antes de un pedido con token o con JSON, el navegador manda un pedido `OPTIONS` (el *preflight*) para preguntar si tiene permiso. `api/cors.php` responde **204** y solo autoriza el origen de `CORS_ORIGEN` (nunca `*`).
- **Consultas preparadas.** Todas las consultas usan PDO con parámetros (`:email`, `:token`), así lo que escribe el usuario nunca se mezcla con el SQL (evita la inyección SQL).
- **Errores de conexión.** Si la base no responde, `api/conexion.php` devuelve un JSON con **500** y guarda el detalle con `error_log()`, sin mostrarlo al usuario.


### Clientes y catálogo

- **El borrado es lógico.** DELETE no elimina la fila: marca `activo = 0` y la clienta o la prenda deja de aparecer en los listados. Se hace así porque las clientas tienen entregas, compras y pagos asociados (y las prendas están dentro de entregas ya registradas), y borrar la fila rompería esas relaciones y haría perder la deuda. El DELETE de clientas responde 204 porque no hay nada para devolver.
- **El teléfono se guarda solo con dígitos y código de país** (por ejemplo `5491122334455`, entre 10 y 15 dígitos), porque el link de WhatsApp lo necesita sin símbolos.
- **El DNI es opcional, pero no se puede repetir.** La columna es `UNIQUE`, que permite varias clientas sin DNI (`NULL`). Si se informa, debe tener 7 u 8 dígitos. El chequeo de repetidos incluye a las clientas dadas de baja, y al editar se excluye a la propia clienta para que su DNI no cuente como repetido. El nombre sí se puede repetir.
- **Consultas preparadas en todo.** Lo que llega en la URL o en el cuerpo se pasa siempre como parámetro de PDO, incluso en las búsquedas con `LIKE`, así nunca se mezcla con el SQL.
- **Las validaciones se hacen en PHP, además de en la base.** El precio y el stock no pueden ser negativos (también hay un `CHECK` en la tabla), el stock tiene que ser un entero y el precio un número. Así la API responde 400 con un mensaje claro en lugar de un error de MySQL.
- **Los números salen como números.** PDO devuelve los números de MySQL como texto; `clientes.php` y `productos.php` los convierten para que el JSON tenga `45000.0` y no `"45000.00"`.
- **La ciudad se geocodifica en el backend, al guardar.** `clientes.php` llama a `servicios.php` cuando se crea o se edita una clienta con ciudad, y guarda latitud y longitud en la base. Así el mapa lee coordenadas ya calculadas, no depende de Open-Meteo cada vez que se abre y el navegador no consulta ningún servicio externo de geocodificación.
- **422 y 400 significan cosas distintas.** Si el pedido está mal armado (falta el nombre, el teléfono es inválido) responde 400. Si el pedido está bien armado pero la ciudad no existe, responde 422: el dato no se puede procesar.
- **Una falla del servicio externo no impide guardar.** Si Open-Meteo no responde, la clienta se guarda igual con latitud y longitud en `null`. En el PUT, si la ciudad no cambió y ya tenía coordenadas, no se vuelve a consultar.
- **Se agregaron las columnas `foto` y `activo` a `productos`.** `activo` permite la baja lógica, porque `entrega_items` tiene una clave foránea a `productos` y una prenda ya entregada no se puede borrar de verdad. `foto` guarda opcionalmente la dirección de una imagen.
- **Errores controlados.** Si la base falla, la respuesta es un 500 con un mensaje genérico y el detalle va a `error_log()`.

### Entregas y confirmación de compra

El contrato completo de estos endpoints está en `docs/contrato_entregas.md`.

- **Las prendas a prueba no suman al saldo.** Una prenda a prueba todavía no es una compra: la clienta puede devolverla. Por eso crear una entrega solo descuenta el stock y deja cada ítem en `en_prueba`, y no toca ningún saldo. Recién `confirmar_entrega.php` pasa un ítem a `comprada`, y en ese momento empieza a contar. Como el saldo se calcula sumando lo comprado y restando lo pagado, la deuda de una clienta solo puede subir por una decisión explícita de compra.
- **Transacción en los dos endpoints.** Crear una entrega son varios pasos (insertar la entrega, insertar cada ítem y descontar el stock de cada prenda), y confirmarla también (cambiar el estado de cada ítem, devolver stock y cerrar la entrega). Si uno fallara a la mitad, la base quedaría inconsistente: una entrega sin todas sus prendas, o stock descontado de algo que nunca se entregó. Con `beginTransaction()`, `commit()` y `rollBack()` de PDO se guarda todo junto o no se guarda nada. Por ejemplo, una entrega con una prenda válida y otra inexistente responde 404 y el stock de la válida queda intacto.
- **El precio se guarda en cada ítem.** `entrega_items.precio_unitario` guarda el precio que tenía la prenda el día de la entrega. Si el catálogo cambia después, lo que la clienta debe no se modifica, porque el saldo se calcula con ese precio y no con el actual de `productos`.
- **El stock se revisa antes de guardar.** Si una prenda no tiene stock, la API responde 400 y no queda nada guardado. Al devolver una prenda, su unidad vuelve al stock.
- **Una entrega cerrada responde 409, no 400.** El pedido está bien armado; lo que lo impide es el estado actual de la entrega. Las validaciones de `confirmar_entrega.php` se hacen en este orden: cuerpo del pedido (400), entrega inexistente (404), entrega ya cerrada (409) e ítem ajeno a la entrega (400).
- **Consultas preparadas y errores controlados.** Todos los datos que llegan del cliente se usan como parámetros de PDO. Si la base falla, la respuesta es un 500 con un mensaje genérico y el detalle va a `error_log()`.
- **Pantallas.** En «Inicio», el botón «Nueva Entrega» abre un formulario donde se elige la clienta, se buscan y agregan prendas del catálogo (solo las que tienen stock) y se ve el total a prueba; al guardar se llama a `POST entregas.php`. En cada entrega abierta, «Confirmar >» abre la lista de prendas con «Se queda / Devuelve» y el importe que se suma al saldo; al confirmar se llama a `PUT confirmar_entrega.php`. Si la API responde con un error (por ejemplo, una prenda sin stock o una entrega ya cerrada), el mensaje se muestra en rojo dentro del popup y este no se cierra. Si el token venció, se vuelve a la pantalla de login.


### Pagos y cuenta corriente

- **El saldo no se guarda en la base.** No hay una columna `saldo` en `clientes`: `resumen.php` lo calcula cada vez, restando lo pagado a lo comprado (`saldo = SUM(compras) - SUM(pagos)`). Así nunca queda desactualizado aunque se confirmen prendas nuevas o se registren pagos al mismo tiempo.
- **`COALESCE` para los totales en cero.** Las sumas usan `COALESCE(SUM(...), 0)`: si una clienta nueva todavía no compró ni pagó nada, la base devuelve `0` y no `NULL`, y la cuenta no da error.
- **Validación del monto.** `POST pagos.php` revisa que el monto sea un número mayor a cero y que no supere la deuda; si no, responde **422**. Antes de registrar el pago también comprueba que la clienta exista y esté activa.
- **Consultas preparadas.** El pago se guarda con parámetros de PDO (`:cliente_id`, `:monto`, `:medio`, `:observacion`), así lo que se escribe nunca se mezcla con el SQL.

### Diseño general del sitio

- **Una sola página.** Casi toda la app está en `frontend/index.html`, con submenús y ventanas emergentes manejados con JavaScript. Así se pueden ver todos los datos y hacer cualquier cambio sin cambiar de página.
- **Submenús.** Desde la barra de navegación de abajo se pasa entre **Inicio**, **Clientes** y **Prendas**. Cada uno muestra la información básica de sus endpoints, con botones para ver más detalle.
- **Ventanas emergentes.** Casi todos los formularios para crear o editar datos se abren en ventanas emergentes. Así las pantallas principales quedan limpias y no hace falta una página nueva para cada formulario.
- **AJAX.** Todas las pantallas piden los datos a la API con `fetch` de forma asincrónica y manejan los errores de cada respuesta. La página nunca necesita recargarse para traer información del servidor.