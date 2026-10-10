<?php
// conexion.php
// Se conecta a la base. Todos los endpoints lo incluyen con require.

// Trae los datos de conexión (DB_HOST, DB_NAME, etc.) desde config.php
require_once __DIR__ . "/config.php";

try {
    // Abre la conexión con PDO, usando los datos de config.php
    $conexion = new PDO(
        "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS
    );
    // Si algo falla, que PDO avise con una excepción (no en silencio)
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

} catch (PDOException $error) {
    // Si no se pudo conectar: responde en JSON, como toda la API
    http_response_code(500);   // 500 = el problema es del servidor
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["error" => "No se pudo conectar a la base"]);
    error_log($error->getMessage());   // el detalle va al log, no a la pantalla
    exit();
}