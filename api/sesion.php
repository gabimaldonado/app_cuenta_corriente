<?php
// sesion.php
// GET    -> dice quién es el usuario del token (sirve para saber si sigue logueado)
// DELETE -> cierra la sesión (borra el token)

require "cors.php";
require "conexion.php";
require "auth.php";      // sin token válido, corta acá con 401
header("Content-Type: application/json; charset=utf-8");

$metodo = $_SERVER["REQUEST_METHOD"];

if ($metodo === "DELETE") {
    // Cerrar sesión: el token deja de servir
    $consulta = $conexion->prepare(
        "UPDATE usuarios SET token = NULL, token_vence = NULL WHERE id = :id"
    );
    $consulta->execute([":id" => $usuarioActual["id"]]);
    http_response_code(204);
    exit();
}

// GET: devolver los datos del usuario logueado
echo json_encode($usuarioActual, JSON_UNESCAPED_UNICODE);