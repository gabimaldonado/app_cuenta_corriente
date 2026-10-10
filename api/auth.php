<?php
// auth.php
// Protege un endpoint: si el pedido no trae un token válido, corta con 401.
// Se usa así, después de cors.php y conexion.php:
//     require "auth.php";
// Si pasa, deja disponible $usuarioActual (id, nombre, email).

// 1. Buscar el encabezado Authorization: "Bearer <token>"
//    (se busca en varios lugares porque algunos servidores lo guardan distinto)
$autorizacion = $_SERVER["HTTP_AUTHORIZATION"]
    ?? $_SERVER["REDIRECT_HTTP_AUTHORIZATION"]
    ?? "";
if ($autorizacion === "" && function_exists("getallheaders")) {
    foreach (getallheaders() as $nombre => $valor) {
        if (strtolower($nombre) === "authorization") {
            $autorizacion = $valor;
        }
    }
}

// 2. Sacar el token: lo que viene después de "Bearer "
$token = "";
if (stripos($autorizacion, "Bearer ") === 0) {
    $token = trim(substr($autorizacion, 7));
}

if ($token === "") {
    http_response_code(401);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["error" => "Falta el token. Iniciá sesión."], JSON_UNESCAPED_UNICODE);
    exit();
}

// 3. Buscar un usuario con ese token que todavía no haya vencido
$consulta = $conexion->prepare(
    "SELECT id, nombre, email FROM usuarios
     WHERE token = :token AND token_vence > NOW()"
);
$consulta->execute([":token" => $token]);
$usuarioActual = $consulta->fetch(PDO::FETCH_ASSOC);

if (!$usuarioActual) {
    http_response_code(401);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["error" => "Token inválido o vencido. Iniciá sesión de nuevo."], JSON_UNESCAPED_UNICODE);
    exit();
}
// Si llegó hasta acá, el token es válido y el endpoint sigue normalmente.