<?php
// productos.php
// CRUD del catálogo de prendas: GET (listar / uno / buscar / filtrar por stock),
// POST, PUT y DELETE lógico.
// Contrato completo en docs/contrato.md

require_once __DIR__ . "/cors.php";      // encabezados CORS y preflight OPTIONS
require_once __DIR__ . "/conexion.php";  // crea $conexion (PDO)
require_once __DIR__ . "/auth.php";      // Valida el token, sin token responde 401.

if (!isset($conexion) || !($conexion instanceof PDO)) {
    http_response_code(500);
    echo json_encode(["error" => "No hay conexión a la base de datos"], JSON_UNESCAPED_UNICODE);
    exit();
}

header("Content-Type: application/json; charset=utf-8");

// ---------- Funciones auxiliares (con tipado para evitar avisos de VS Code) -------

// Envía la respuesta en JSON con el código de estado y corta la ejecución
function responder(int $codigo, mixed $datos = null): void {
    http_response_code($codigo);
    if ($codigo !== 204) {
        echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// Lee el JSON que mandó el frontend en el body (POST y PUT)
function leerCuerpo(): array {
    $datos = json_decode(file_get_contents("php://input"), true);
    if (!is_array($datos)) {
        responder(400, ["error" => "El cuerpo del pedido debe ser un JSON válido"]);
    }
    return $datos;
}

// Convierte tipos de MySQL a tipos numéricos reales
function formatearProducto(array $fila): array {
    $fila["id"]     = (int) $fila["id"];
    $fila["precio"] = (float) $fila["precio"];
    $fila["stock"]  = (int) $fila["stock"];
    $fila["activo"] = (int) $fila["activo"];
    return $fila;
}

// Busca una prenda activa por id (usa la tabla prendas)
function buscarProducto(PDO $conexion, int $id): array|false {
    $stmt = $conexion->prepare(
        "SELECT id, descripcion, talle, color, precio, stock, foto, activo
         FROM prendas WHERE id = :id AND activo = 1"
    );
    $stmt->execute([":id" => $id]);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);
    return $fila ? formatearProducto($fila) : false;
}

// Obtiene el id de la URL (?id=) y verifica que sea un número
function obtenerId(): int {
    if (!isset($_GET["id"]) || !ctype_digit($_GET["id"])) {
        responder(400, ["error" => "Falta el id o no es válido"]);
    }
    return (int) $_GET["id"];
}

// Valida los datos de una prenda
function validarProducto(array $datos): array {
    $descripcion = trim($datos["descripcion"] ?? "");
    $talle       = trim($datos["talle"] ?? "");
    $color       = trim($datos["color"] ?? "");
    $foto        = trim($datos["foto"] ?? "");

    if ($descripcion === "" || $talle === "" || $color === "") {
        responder(400, ["error" => "La descripción, el talle y el color son obligatorios"]);
    }
    if (mb_strlen($descripcion) > 100 || mb_strlen($talle) > 10 ||
        mb_strlen($color) > 30 || mb_strlen($foto) > 255) {
        responder(400, ["error" => "Algún campo supera el largo permitido"]);
    }

    if (!isset($datos["precio"]) || !is_numeric($datos["precio"]) || $datos["precio"] < 0) {
        responder(400, ["error" => "El precio debe ser un número mayor o igual a 0"]);
    }
    $stock = isset($datos["stock"]) ? filter_var($datos["stock"], FILTER_VALIDATE_INT) : false;
    if ($stock === false || $stock < 0) {
        responder(400, ["error" => "El stock debe ser un entero mayor o igual a 0"]);
    }

    return [
        "descripcion" => $descripcion,
        "talle"       => $talle,
        "color"       => $color,
        "precio"      => (float) $datos["precio"],
        "stock"       => $stock,
        "foto"        => $foto === "" ? null : $foto,
    ];
}

//--------- Lógica principal -------

$metodo = $_SERVER["REQUEST_METHOD"];

try {
    switch ($metodo) {

        case "GET":
            // GET ?id=1 -> una prenda
            if (isset($_GET["id"])) {
                $producto = buscarProducto($conexion, obtenerId());
                if (!$producto) {
                    responder(404, ["error" => "Prenda no encontrada"]);
                }
                responder(200, $producto);
            }

            // Listado con filtros
            $sql = "SELECT id, descripcion, talle, color, precio, stock, foto, activo
                    FROM prendas WHERE activo = 1";
            $params = [];

            if (isset($_GET["buscar"]) && trim($_GET["buscar"]) !== "") {
                $texto = "%" . trim($_GET["buscar"]) . "%";
                $sql .= " AND (descripcion LIKE :b1 OR talle LIKE :b2 OR color LIKE :b3)";
                $params[":b1"] = $texto;
                $params[":b2"] = $texto;
                $params[":b3"] = $texto;
            }

            if (isset($_GET["stock"]) && $_GET["stock"] !== "") {
                if ($_GET["stock"] === "con") {
                    $sql .= " AND stock > 0";
                } elseif ($_GET["stock"] === "sin") {
                    $sql .= " AND stock = 0";
                } else {
                    responder(400, ["error" => "El filtro stock solo acepta 'con' o 'sin'"]);
                }
            }

            $sql .= " ORDER BY descripcion, talle, color";
            $stmt = $conexion->prepare($sql);
            $stmt->execute($params);
            responder(200, array_map("formatearProducto", $stmt->fetchAll(PDO::FETCH_ASSOC)));
            break;

        case "POST":
            $d = validarProducto(leerCuerpo());

            $stmt = $conexion->prepare(
                "INSERT INTO prendas (descripcion, talle, color, precio, stock, foto)
                 VALUES (:descripcion, :talle, :color, :precio, :stock, :foto)"
            );
            $stmt->execute([
                ":descripcion" => $d["descripcion"],
                ":talle"       => $d["talle"],
                ":color"       => $d["color"],
                ":precio"      => $d["precio"],
                ":stock"       => $d["stock"],
                ":foto"        => $d["foto"],
            ]);
            responder(201, buscarProducto($conexion, (int)$conexion->lastInsertId()));
            break;

        case "PUT":
            $id = obtenerId();
            if (!buscarProducto($conexion, $id)) {
                responder(404, ["error" => "Prenda no encontrada"]);
            }
            $d = validarProducto(leerCuerpo());

            $stmt = $conexion->prepare(
                "UPDATE prendas
                 SET descripcion = :descripcion, talle = :talle, color = :color,
                     precio = :precio, stock = :stock, foto = :foto
                 WHERE id = :id"
            );
            $stmt->execute([
                ":descripcion" => $d["descripcion"],
                ":talle"       => $d["talle"],
                ":color"       => $d["color"],
                ":precio"      => $d["precio"],
                ":stock"       => $d["stock"],
                ":foto"        => $d["foto"],
                ":id"          => $id,
            ]);
            responder(200, buscarProducto($conexion, $id));
            break;

        case "DELETE":
            $id = obtenerId();
            if (!buscarProducto($conexion, $id)) {
                responder(404, ["error" => "Prenda no encontrada"]);
            }
            $stmt = $conexion->prepare("UPDATE prendas SET activo = 0 WHERE id = :id");
            $stmt->execute([":id" => $id]);
            responder(200, ["mensaje" => "Prenda dada de baja"]);
            break;

        default:
            responder(405, ["error" => "Metodo no permitido"]);
    }

} catch (PDOException $error) {
    error_log($error->getMessage());
    // Muestra el mensaje detallado para diagnosticar si aún falta alguna columna en la BD
    responder(500, ["error" => "Error de base de datos: " . $error->getMessage()]);
}