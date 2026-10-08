<?php
// login.php
// Recibe email y contraseña. Si son correctos, devuelve un token.
// POST  {"email": "...", "password": "..."}

require "cors.php";
require "conexion.php";
header("Content-Type: application/json; charset=utf-8");

// Solo se aceptan pedidos POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);   // 405 = método no permitido
    echo json_encode(["error" => "Usá POST para iniciar sesión"], JSON_UNESCAPED_UNICODE);
    exit();
}

// Leer el JSON que manda el frontend
$cuerpo = json_decode(file_get_contents("php://input"), true);
$email    = trim($cuerpo["email"] ?? "");
$password = $cuerpo["password"] ?? "";

// Validar que vengan los dos datos
if ($email === "" || $password === "") {
    http_response_code(400);
    echo json_encode(["error" => "Faltan el email o la contraseña"], JSON_UNESCAPED_UNICODE);
    exit();
}

// Buscar al usuario por su email (consulta preparada)
$consulta = $conexion->prepare("SELECT * FROM usuarios WHERE email = :email");
$consulta->execute([":email" => $email]);
$usuario = $consulta->fetch(PDO::FETCH_ASSOC);

// Si no existe, o la contraseña no coincide con el hash: 401
if (!$usuario || !password_verify($password, $usuario["password_hash"])) {
    http_response_code(401);
    echo json_encode(["error" => "Email o contraseña incorrectos"], JSON_UNESCAPED_UNICODE);
    exit();
}

// Crear el token: 64 caracteres al azar, imposibles de adivinar
$token = bin2hex(random_bytes(32));

// Guardarlo en la base, en la fila de ese usuario.
// Vence en 8 horas: lo calcula MySQL con su propio reloj (NOW()).
$consulta = $conexion->prepare(
    "UPDATE usuarios
     SET token = :token, token_vence = NOW() + INTERVAL 8 HOUR
     WHERE id = :id"
);
$consulta->execute([":token" => $token, ":id" => $usuario["id"]]);

// Responder con el token (el frontend lo guarda y lo manda en cada pedido)
echo json_encode([
    "token"  => $token,
    "nombre" => $usuario["nombre"]
], JSON_UNESCAPED_UNICODE);