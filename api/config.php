<?php

// Configuración de la app. Lee los datos de las VARIABLES DE ENTORNO
// (las que se cargan en el panel del proveedor cloud, R7 de la consigna).
// Si una variable no existe (por ejemplo en XAMPP), usa el valor de respaldo.

// Lee una variable de entorno; si no está, devuelve el valor de respaldo.
function entorno($nombre, $respaldo) {
    $valor = getenv($nombre);
    if ($valor === false || $valor === "") {
        $valor = $_ENV[$nombre] ?? $_SERVER[$nombre] ?? $respaldo;
    }
    return $valor;
}

// Base de datos, los respaldos son los de XAMPP
define("DB_HOST", entorno("DB_HOST", "localhost"));
define("DB_PORT", entorno("DB_PORT", "3306"));
define("DB_NAME", entorno("DB_NAME", "cuenta_corriente"));
define("DB_USER", entorno("DB_USER", "root"));
define("DB_PASS", entorno("DB_PASS", ""));

// Qué página puede usar la API (CORS)
define("CORS_ORIGEN", entorno("CORS_ORIGEN", "http://localhost:5500"));

// En la nube se carga APP_ENV=produccion: ahí los errores de PHP
// NO se muestran en pantalla (R8); quedan solo en el log del servidor.
define("PRODUCCION", entorno("APP_ENV", "local") === "produccion");
ini_set("display_errors", PRODUCCION ? "0" : "1");