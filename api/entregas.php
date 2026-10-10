<?php
// api/entregas.php
// Entregas a prueba.
// GET ?cliente_id=3    -> las entregas de esa clienta
// GET ?estado=abierta  -> las entregas en ese estado
// GET (sin nada)       -> todas las entregas

require "cors.php";
require "conexion.php";
require "auth.php";
header("Content-Type: application/json; charset=utf-8");

$metodo = $_SERVER["REQUEST_METHOD"];

if ($metodo === "GET") {

    if (isset($_GET["cliente_id"])) {
        $consulta = $conexion->prepare(
            "SELECT * FROM entregas WHERE cliente_id = :cliente_id ORDER BY fecha DESC"
        );
        $consulta->execute([":cliente_id" => $_GET["cliente_id"]]);
        echo json_encode($consulta->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
        exit();
    }

    if (isset($_GET["estado"])) {
        $consulta = $conexion->prepare(
            "SELECT * FROM entregas WHERE estado = :estado ORDER BY fecha DESC"
        );
        $consulta->execute([":estado" => $_GET["estado"]]);
        echo json_encode($consulta->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
        exit();
    }

    $consulta = $conexion->query("SELECT * FROM entregas ORDER BY fecha DESC");
    echo json_encode($consulta->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
    exit();
}

// Cualquier otro método (por ahora)
http_response_code(405);
echo json_encode(["error" => "Método no permitido"], JSON_UNESCAPED_UNICODE);