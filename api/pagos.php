<?php

// api/pagos.php
// Manejo de registros y consulta de historial de pagos por clienta

require_once "cors.php";
require_once "conexion.php";
require_once "auth.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER['REQUEST_METHOD'];

// METODO GET: Listar pagos de una clienta (?cliente_id=X)

if ($metodo === 'GET') {
    $cliente_id = isset($_GET['cliente_id']) ? intval($_GET['cliente_id']) : null;

    if (!$cliente_id) {
        http_response_code(400);
        echo json_encode(["error" => "El parametro cliente_id es obligatorio."]);
        exit;
    }

    try {
        // Consulta los pagos ordenados de mas reciente a mas antiguo
        $stmt = $conexion->prepare("SELECT id, cliente_id, fecha, monto, medio, observacion 
                               FROM pagos 
                               WHERE cliente_id = :cliente_id 
                               ORDER BY fecha DESC");
        $stmt->execute([':cliente_id' => $cliente_id]);
        $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formatea montos a float para consistencia JSON
        foreach ($pagos as &$pago) {
            $pago['monto'] = floatval($pago['monto']);
        }

        http_response_code(200);
        echo json_encode($pagos);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Error interno al obtener los pagos."]);
    }
    exit;
}

// METODO POST: Registra un nuevo pago

if ($metodo === 'POST') {
    $datos = json_decode(file_get_contents('php://input'), true);

    if (!$datos) {
        http_response_code(400);
        echo json_encode(["error" => "Cuerpo de solicitud JSON invalido o vacio."]);
        exit;
    }

    $cliente_id  = isset($datos['cliente_id']) ? intval($datos['cliente_id']) : null;
    $monto       = isset($datos['monto']) ? floatval($datos['monto']) : null;
    $medio       = isset($datos['medio']) ? trim($datos['medio']) : 'efectivo';
    $observacion = isset($datos['observacion']) ? trim($datos['observacion']) : null;

    // Validación 1: ID de cliente obligatorio
    if (!$cliente_id) {
        http_response_code(400);
        echo json_encode(["error" => "El ID de cliente es obligatorio."]);
        exit;
    }

    // Validación 2: Monto mayor a cero (422 ante dato que no se puede procesar)
    if ($monto === null || $monto <= 0) {
        http_response_code(422);
        echo json_encode(["error" => "El monto del pago debe ser mayor a 0."]);
        exit;
    }

    // Validación 3: Medios de pago validos segun enum del diagrama ER
    $medios_permitidos = ['efectivo', 'transferencia', 'tarjeta', 'otro'];
    if (!in_array($medio, $medios_permitidos)) {
        $medio = 'efectivo';
    }

    try {
        // Verificar que la clienta exista y este activa (404 si no existe)
        $stmtCliente = $conexion->prepare("SELECT id, nombre FROM clientes WHERE id = :id AND activo = 1");
        $stmtCliente->execute([':id' => $cliente_id]);
        $cliente = $stmtCliente->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) {
            http_response_code(404);
            echo json_encode(["error" => "La clienta no existe o se encuentra inactiva."]);
            exit;
        }

        // Insertar el pago con consulta preparada
        $stmtInsert = $conexion->prepare("INSERT INTO pagos (cliente_id, fecha, monto, medio, observacion) 
                                     VALUES (:cliente_id, NOW(), :monto, :medio, :observacion)");
        $stmtInsert->execute([
            ':cliente_id'  => $cliente_id,
            ':monto'       => $monto,
            ':medio'       => $medio,
            ':observacion' => $observacion
        ]);

        $nuevo_id = (int)$conexion->lastInsertId();

        // Respuesta exitosa (201 Created)
        http_response_code(201);
        echo json_encode([
            "mensaje" => "Pago registrado correctamente",
            "pago" => [
                "id"          => $nuevo_id,
                "cliente_id"  => $cliente_id,
                "monto"       => $monto,
                "medio"       => $medio,
                "observacion" => $observacion
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Error interno del servidor al procesar el pago."]);
    }
    exit;
}

// Cualquier otro metodo no soportado
http_response_code(405);
echo json_encode(["error" => "Metodo no permitido."]);