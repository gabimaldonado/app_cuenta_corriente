<?php

// Endpoint de prueba: dice si la API y la base funcionan.
// Sirve para probar rápido cuando la app esté en el hosting.

require "cors.php";        // 1. siempre primero: permisos CORS
require "conexion.php";    // 2. la conexión a la base

header("Content-Type: application/json; charset=utf-8");

// Cuenta las clientas, solo para comprobar que la base responde
$total = $conexion->query("SELECT COUNT(*) FROM clientes")->fetchColumn();

echo json_encode([
    "api"      => "ok",
    "base"     => "conectada",
    "clientes" => (int) $total
]);