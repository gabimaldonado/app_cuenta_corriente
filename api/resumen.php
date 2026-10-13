<?php

// api/resumen.php
// Reporte financiero consolidado y panel de control de deudores

require_once "cors.php";
require_once "conexion.php";
require_once "auth.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido"]);
    exit;
}

// CASO 1: Panel de deudores (?deudores=1)
if (isset($_GET['deudores']) && $_GET['deudores'] == '1') {
    try {
        // Obtenemos clientas activas cruzando compras confirmadas menos pagos
        $sql = "
            SELECT 
                c.id AS cliente_id,
                c.nombre,
                c.telefono,
                (
                    COALESCE((
                        SELECT SUM(ei.precio_unitario)
                        FROM entrega_items ei
                        JOIN entregas e ON ei.entrega_id = e.id
                        WHERE e.cliente_id = c.id 
                          AND ei.estado = 'comprada'
                    ), 0)
                    -
                    COALESCE((
                        SELECT SUM(p.monto)
                        FROM pagos p
                        WHERE p.cliente_id = c.id
                    ), 0)
                ) AS saldo
            FROM clientes c
            WHERE c.activo = 1
            HAVING saldo > 0
            ORDER BY saldo DESC
        ";

        $stmt = $conexion->prepare($sql);
        $stmt->execute();
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $deudores = [];
        $total_deuda_general = 0.0;

        foreach ($filas as $fila) {
            $saldo = floatval($fila['saldo']);
            $total_deuda_general += $saldo;

            $deudores[] = [
                "cliente_id" => (int)$fila['cliente_id'],
                "nombre"     => $fila['nombre'],
                "telefono"   => $fila['telefono'],
                "saldo"      => $saldo
            ];
        }

        http_response_code(200);
        echo json_encode([
            "total_deuda_general" => $total_deuda_general,
            "deudores"            => $deudores
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Error interno al obtener el panel de deudores."]);
    }
    exit;
}

// CASO 2: Ficha financiera de una clienta (?cliente_id=X)

$cliente_id = isset($_GET['cliente_id']) ? intval($_GET['cliente_id']) : null;

if (!$cliente_id) {
    http_response_code(400);
    echo json_encode(["error" => "El parametro cliente_id es obligatorio."]);
    exit;
}

try {
    // Verificar si la clienta existe y está activa
    $stmtCliente = $conexion->prepare("SELECT id, nombre, telefono FROM clientes WHERE id = :id AND activo = 1");
    $stmtCliente->execute([':id' => $cliente_id]);
    $cliente = $stmtCliente->fetch(PDO::FETCH_ASSOC);

    if (!$cliente) {
        http_response_code(404);
        echo json_encode(["error" => "Clienta no encontrada"]);
        exit;
    }

    // Calcular total de compras confirmadas (estado = 'comprada')
    $stmtCompras = $conexion->prepare("
        SELECT COALESCE(SUM(ei.precio_unitario), 0) AS total_compras
        FROM entrega_items ei
        JOIN entregas e ON ei.entrega_id = e.id
        WHERE e.cliente_id = :cliente_id 
          AND ei.estado = 'comprada'
    ");
    $stmtCompras->execute([':cliente_id' => $cliente_id]);
    $total_compras = floatval($stmtCompras->fetchColumn());

    // Calcular total de pagos registrados
    $stmtPagosTotal = $conexion->prepare("
        SELECT COALESCE(SUM(monto), 0) AS total_pagos
        FROM pagos
        WHERE cliente_id = :cliente_id
    ");
    $stmtPagosTotal->execute([':cliente_id' => $cliente_id]);
    $total_pagos = floatval($stmtPagosTotal->fetchColumn());

    // Saldo actual
    $saldo_actual = $total_compras - $total_pagos;

    // obtener prendas que mantiene en prueba (estado = 'en_prueba')
    $stmtPrueba = $conexion->prepare("
        SELECT 
            p.id AS producto_id,
            p.descripcion,
            p.talle,
            ei.precio_unitario
        FROM entrega_items ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN productos p ON ei.producto_id = p.id
        WHERE e.cliente_id = :cliente_id 
          AND ei.estado = 'en_prueba'
        ORDER BY ei.id ASC
    ");
    $stmtPrueba->execute([':cliente_id' => $cliente_id]);
    $prendas_raw = $stmtPrueba->fetchAll(PDO::FETCH_ASSOC);

    $prendas_en_prueba = [];
    foreach ($prendas_raw as $pr) {
        $prendas_en_prueba[] = [
            "producto_id"     => (int)$pr['producto_id'],
            "descripcion"     => $pr['descripcion'],
            "talle"           => $pr['talle'],
            "precio_unitario" => floatval($pr['precio_unitario'])
        ];
    }

    // Obtener historial de pagos
    $stmtPagos = $conexion->prepare("
        SELECT id, fecha, monto, medio
        FROM pagos
        WHERE cliente_id = :cliente_id
        ORDER BY fecha DESC
    ");
    $stmtPagos->execute([':cliente_id' => $cliente_id]);
    $pagos_raw = $stmtPagos->fetchAll(PDO::FETCH_ASSOC);

    $pagos = [];
    foreach ($pagos_raw as $p) {
        $pagos[] = [
            "id"    => (int)$p['id'],
            "fecha" => $p['fecha'],
            "monto" => floatval($p['monto']),
            "medio" => $p['medio']
        ];
    }

    // Respuesta JSON consolidada
    http_response_code(200);
    echo json_encode([
        "cliente"           => [
            "id"       => (int)$cliente['id'],
            "nombre"   => $cliente['nombre'],
            "telefono" => $cliente['telefono']
        ],
        "total_compras"     => $total_compras,
        "total_pagos"       => $total_pagos,
        "saldo_actual"      => $saldo_actual,
        "prendas_en_prueba" => $prendas_en_prueba,
        "pagos"             => $pagos
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error interno al procesar el resumen."]);
}