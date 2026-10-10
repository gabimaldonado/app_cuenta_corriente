<?php

// Permisos CORS: le dice al navegador qué página puede usar la API.
// Todos los endpoints lo incluyen primero, antes que cualquier otra cosa.

// Trae CORS_ORIGEN desde config.php (cambia entre la compu y el hosting)
require_once __DIR__ . "/config.php";

// Qué origen puede leer las respuestas de esta API
header("Access-Control-Allow-Origin: " . CORS_ORIGEN);
// Qué métodos puede usar
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// Qué encabezados puede mandar (Authorization va a llevar el token del login)
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// El navegador manda primero un OPTIONS ("¿me dejás?") antes de PUT, DELETE
// o de un POST con JSON. Se le contesta que sí y se corta acá.
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);   // 204 = OK, sin contenido
    exit();
}