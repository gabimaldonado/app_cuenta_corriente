<?php
// productos.php
// CRUD del catálogo de prendas: GET (listar / uno / buscar / filtrar por stock),
// POST, PUT y DELETE lógico.
// Contrato completo en docs/contrato.md

require_once __DIR__ . "/cors.php";      // encabezados CORS y preflight OPTIONS
require_once __DIR__ . "/conexion.php";  // crea $conexion (PDO)
// require_once __DIR__ . "/auth.php";   // TODO: descomentar cuando Gaby lo suba (valida el token)

if (!isset($conexion) || !($conexion instanceof PDO)) {
    http_response_code(500);
    echo json_encode(["error" => "No hay conexión a la base de datos"], JSON_UNESCAPED_UNICODE);
    exit();
}

header("Content-Type: application/json; charset=utf-8");

// ---------- Funciones auxiliares -------
// Envía la respuesta en JSON con el código de estado y corta la ejecución
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit();
}

//lee el JSON que mando el frontend en el body (POST y PUT)-.
function leerCuerpo() {
    $datos = json_decode(file_get_contents("php://input"), true);
    if (!is_array($datos)) {
        responder(400, ["error" => "El cuerpo del pedido debe ser un JSON válido"]);
    }
    return $datos;
}

//PDO devuelve los numeros de MySQL como texto ("45000.00"). Los convertimos
//para que el JSON tenga numeros de verdad, como dice el contrato.
function formatearProducto($fila) {
    $fila["id"]     = (int) $fila["id"];
    $fila["precio"] = (float) $fila["precio"];
    $fila["stock"]  = (int) $fila["stock"];
    $fila["activo"] = (int) $fila["activo"];
    return $fila;
}

// Busca una prenda activa por id; devuelve la fila o false si no existe-.
function buscarProducto($conexion, $id) {
    $stmt = $conexion->prepare(
        "SELECT id, descripcion, talle, color, precio, stock, foto, activo
         FROM productos WHERE id = :id AND activo = 1"
    );
    $stmt->execute([":id" => $id]);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);
    return $fila ? formatearProducto($fila) : false;
}

//Obtiene el id de la URL (?id=) y verifica que sea un numero
function obtenerId() {
    if (!isset($_GET["id"]) || !ctype_digit($_GET["id"])) {
        responder(400, ["error" => "Falta el id o no es válido"]);
    }
    return (int) $_GET["id"];
}

//Valida los datos de una prenda. Si algo esta mal, responde 400 y corta.
function validarProducto($datos) {
    $descripcion = trim($datos["descripcion"] ?? "");
    $talle       = trim($datos["talle"] ?? "");
    $color       = trim($datos["color"] ?? "");
    $foto        = trim($datos["foto"] ?? "");

    if ($descripcion === "" || $talle === "" || $color === "") {
        responder(400, ["error" => "La descripción, el talle y el color son obligatorios"]);
    }
    //Largos maximos: son los de las columnas. Si no, MySQL fallaria con un error.
    if (mb_strlen($descripcion) > 100 || mb_strlen($talle) > 10 ||
        mb_strlen($color) > 30 || mb_strlen($foto) > 255) {
        responder(400, ["error" => "Algún campo supera el largo permitido"]);
    }

    //is_numeric acepta 45000 y "45000.50", pero rechaza texto, vacio y null.
    if (!isset($datos["precio"]) || !is_numeric($datos["precio"]) || $datos["precio"] < 0) {
        responder(400, ["error" => "El precio debe ser un número mayor o igual a 0"]);
    }
    //el stock tiene que ser un entero: FILTER_VALIDATE_INT devuelve false si no lo es.
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

//---------Logica principal-------

$metodo = $_SERVER["REQUEST_METHOD"];

try {
    switch ($metodo) {

        case "GET":
            //GET ?id=1 -> una prenda
            if (isset($_GET["id"])) {
                $producto = buscarProducto($conexion, obtenerId());
                if (!$producto) {
                    responder(404, ["error" => "Prenda no encontrada"]);
                }
                responder(200, $producto);
            }

            //Listado. Los filtros se van sumando al WHERE y se pueden combinar.
            $sql = "SELECT id, descripcion, talle, color, precio, stock, foto, activo
                    FROM productos WHERE activo = 1";
            $params = [];

            //buscar=texto -> busca en la descripción, un talle o color.
            if (isset($_GET["buscar"]) && trim($_GET["buscar"]) !== "") {
                $texto = "%" . trim($_GET["buscar"]) . "%";
                $sql .= " AND (descripcion LIKE :b1 OR talle LIKE :b2 OR color LIKE :b3)";
                $params[":b1"] = $texto;
                $params[":b2"] = $texto;
                $params[":b3"] = $texto;
            }

            // ?stock=con (stock > 0) o ?stock=sin (stock = 0)
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
                "INSERT INTO productos (descripcion, talle, color, precio, stock, foto)
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
            responder(201, buscarProducto($conexion, $conexion->lastInsertId()));
            break;

        case "PUT":
            $id = obtenerId();
            if (!buscarProducto($conexion, $id)) {
                responder(404, ["error" => "Prenda no encontrada"]);
            }
            $d = validarProducto(leerCuerpo());

            $stmt = $conexion->prepare(
                "UPDATE productos
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
            //Borrado Logico: la prenda puede estar en entregas ya registradas
            //(entrega_items), asi que no se elimina la fila, solo se oculta.
            $stmt = $conexion->prepare("UPDATE productos SET activo = 0 WHERE id = :id");
            $stmt->execute([":id" => $id]);
            responder(200, ["mensaje" => "Prenda dada de baja"]);
            break;

        default:
            responder(405, ["error" => "Metodo no permitido"]);
    }

} catch (PDOException $error) {
    //error inesperado de la base: el detalle va al log, al usuario un mensaje generico.
    error_log($error->getMessage());
    responder(500, ["error" => "Error interno del servidor"]);
}