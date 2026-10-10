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

if ($metodo === "POST") {
    // El cuerpo viene en JSON: {"cliente_id": 1, "productos": [3, 5, 7]}
    // Cada número de "productos" es una prenda que se lleva a probar.
    $cuerpo = json_decode(file_get_contents("php://input"), true);

    if (!isset($cuerpo["cliente_id"]) || !isset($cuerpo["productos"])
        || !is_array($cuerpo["productos"]) || count($cuerpo["productos"]) === 0) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan cliente_id o productos"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // La clienta tiene que existir y estar activa
    $consulta = $conexion->prepare("SELECT id, activo FROM clientes WHERE id = :id");
    $consulta->execute([":id" => $cuerpo["cliente_id"]]);
    $cliente = $consulta->fetch(PDO::FETCH_ASSOC);

    if ($cliente === false) {
        http_response_code(404);
        echo json_encode(["error" => "No existe esa clienta"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    if ((int) $cliente["activo"] === 0) {
        http_response_code(400);
        echo json_encode(["error" => "La clienta está dada de baja"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        // Todo lo que sigue se hace junto o no se hace: si algo falla, no queda nada a medias
        $conexion->beginTransaction();

        $consulta = $conexion->prepare("INSERT INTO entregas (cliente_id) VALUES (:cliente_id)");
        $consulta->execute([":cliente_id" => $cliente["id"]]);
        $entregaId = (int) $conexion->lastInsertId();

        foreach ($cuerpo["productos"] as $productoId) {

            if (!is_numeric($productoId)) {
                $conexion->rollBack();
                http_response_code(400);
                echo json_encode(["error" => "Cada prenda tiene que ser un número de id"], JSON_UNESCAPED_UNICODE);
                exit();
            }

            $consulta = $conexion->prepare("SELECT id, precio, stock FROM productos WHERE id = :id");
            $consulta->execute([":id" => $productoId]);
            $producto = $consulta->fetch(PDO::FETCH_ASSOC);

            if ($producto === false) {
                $conexion->rollBack();
                http_response_code(404);
                echo json_encode(["error" => "No existe la prenda con id " . $productoId], JSON_UNESCAPED_UNICODE);
                exit();
            }
            if ((int) $producto["stock"] < 1) {
                $conexion->rollBack();
                http_response_code(400);
                echo json_encode(["error" => "No hay stock de la prenda con id " . $productoId], JSON_UNESCAPED_UNICODE);
                exit();
            }

            // Se guarda el precio de HOY: si el catálogo cambia después, esta entrega no
            $consulta = $conexion->prepare(
                "INSERT INTO entrega_items (entrega_id, producto_id, precio_unitario)
                 VALUES (:entrega_id, :producto_id, :precio)"
            );
            $consulta->execute([
                ":entrega_id"  => $entregaId,
                ":producto_id" => $producto["id"],
                ":precio"      => $producto["precio"]
            ]);

            // La prenda sale del local: una unidad menos de stock
            $consulta = $conexion->prepare("UPDATE productos SET stock = stock - 1 WHERE id = :id");
            $consulta->execute([":id" => $producto["id"]]);
        }

        $conexion->commit();

    } catch (PDOException $error) {
        if ($conexion->inTransaction()) {
            $conexion->rollBack();
        }
        error_log($error->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "No se pudo crear la entrega"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(201);
    echo json_encode([
        "id"         => $entregaId,
        "cliente_id" => (int) $cliente["id"],
        "estado"     => "abierta"
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Cualquier otro método (por ahora)
http_response_code(405);
echo json_encode(["error" => "Método no permitido"], JSON_UNESCAPED_UNICODE);