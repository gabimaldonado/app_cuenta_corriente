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

_(Cada integrante agrega acá un apartado con las decisiones de su módulo.)_