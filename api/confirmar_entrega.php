<?php
// api/confirmar_entrega.php
// PUT {"entrega_id": 2, "items": [4, 6]}
// "items" son los ids de entrega_items que la clienta SE QUEDA.
// Los demás de esa entrega pasan a "devuelta" y vuelven al stock.

require "cors.php";
require "conexion.php";
require "auth.php";
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "PUT") {
    http_response_code(405);
    echo json_encode(["error" => "Usá PUT para confirmar una entrega"], JSON_UNESCAPED_UNICODE);
    exit();
}

$cuerpo = json_decode(file_get_contents("php://input"), true);

// "items" puede ser una lista vacía: significa que devuelve todo
if (!isset($cuerpo["entrega_id"]) || !is_numeric($cuerpo["entrega_id"])
    || !isset($cuerpo["items"]) || !is_array($cuerpo["items"])) {
    http_response_code(400);
    echo json_encode(["error" => "Faltan entrega_id o items"], JSON_UNESCAPED_UNICODE);
    exit();
}

// La entrega tiene que existir (404) y estar abierta (409)
$consulta = $conexion->prepare("SELECT id, estado FROM entregas WHERE id = :id");
$consulta->execute([":id" => $cuerpo["entrega_id"]]);
$entrega = $consulta->fetch(PDO::FETCH_ASSOC);

if ($entrega === false) {
    http_response_code(404);
    echo json_encode(["error" => "No existe esa entrega"], JSON_UNESCAPED_UNICODE);
    exit();
}
if ($entrega["estado"] === "cerrada") {
    http_response_code(409);
    echo json_encode(["error" => "Esa entrega ya estaba cerrada"], JSON_UNESCAPED_UNICODE);
    exit();
}

// Las prendas que todavía están a prueba en esta entrega,
// guardadas con su id como clave para poder buscarlas rápido
$consulta = $conexion->prepare(
    "SELECT id, producto_id, precio_unitario FROM entrega_items
     WHERE entrega_id = :entrega_id AND estado = 'en_prueba'"
);
$consulta->execute([":entrega_id" => $entrega["id"]]);
$propios = [];
foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $item) {
    $propios[(int) $item["id"]] = $item;
}

// Cada id que mandó el cliente tiene que ser de ESTA entrega
$elegidos = [];
foreach ($cuerpo["items"] as $idElegido) {
    if (!is_numeric($idElegido) || !isset($propios[(int) $idElegido])) {
        http_response_code(400);
        echo json_encode(["error" => "El ítem " . $idElegido . " no pertenece a esta entrega"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    $elegidos[(int) $idElegido] = true;
}

try {
    // Todo junto o nada: si algo falla, no queda nada a medias
    $conexion->beginTransaction();

    $comprados = 0;
    $devueltos = 0;
    $total = 0;

    foreach ($propios as $itemId => $item) {
        if (isset($elegidos[$itemId])) {
            // Se la queda: pasa a comprada
            $consulta = $conexion->prepare("UPDATE entrega_items SET estado = 'comprada' WHERE id = :id");
            $consulta->execute([":id" => $itemId]);
            $comprados++;
            $total += (float) $item["precio_unitario"];
        } else {
            // La devuelve: pasa a devuelta y la unidad vuelve al stock
            $consulta = $conexion->prepare("UPDATE entrega_items SET estado = 'devuelta' WHERE id = :id");
            $consulta->execute([":id" => $itemId]);
            $consulta = $conexion->prepare("UPDATE productos SET stock = stock + 1 WHERE id = :id");
            $consulta->execute([":id" => $item["producto_id"]]);
            $devueltos++;
        }
    }

    // La entrega se cierra
    $consulta = $conexion->prepare("UPDATE entregas SET estado = 'cerrada' WHERE id = :id");
    $consulta->execute([":id" => $entrega["id"]]);

    $conexion->commit();

} catch (PDOException $error) {
    if ($conexion->inTransaction()) {
        $conexion->rollBack();
    }
    error_log($error->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "No se pudo confirmar la entrega"], JSON_UNESCAPED_UNICODE);
    exit();
}

echo json_encode([
    "entrega_id"      => (int) $entrega["id"],
    "estado"          => "cerrada",
    "comprados"       => $comprados,
    "devueltos"       => $devueltos,
    "total_comprado"  => round($total, 2)
], JSON_UNESCAPED_UNICODE);