<?php
// clientes.php
// CRUD de clientes: GET (listar / uno / buscar), POST, PUT Y DELETE lógico.
// al crear o editar una clienta se geocodifica su ciudad (Open-Meteo, en servicios.php)
// Y se guardan latitud y longitud, que usa el mapa.
// Contrato completo en docs/contrato.md

require_once __DIR__ . "/cors.php";       //encabezados CORDS
require_once __DIR__ . "/conexion.php";  //crea la conexion (PDO)
require_once __DIR__ . "/auth.php";     //valida el token: sin el token va responder 401
require_once __DIR__ . "/servicio.php"; //geocodificación de la ciudad (servicio externo)

if (!isset($conexion) || !($conexion instanceof PDO)) {
    $conexion = null;
}

header("Content-Type: application/json; charset=utf-8");

//--------Funciones auxiliares--------
function asegurarConexion($conexion) {
    if (!($conexion instanceof PDO)) {
        responder(500, ["error" => "No hay conexión a la base de datos"]);
    }

    return $conexion;
}

// envia la respuesta en JSON con el codigo del estado y corta la ejecución.
// El 204 sin contenido, no lleva cuerpo.
function responder($codigo, $datos = null) {
    http_response_code($codigo);
    if ($codigo !== 204) {
        echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// lee el JSON que mando el frontend en el body (POST Y PUT)
function leerCuerpo() {
    $datos = json_decode(file_get_contents("php://input"), true);
    if (!is_array($datos)) {
        responder(400, ["error" => "El cuerpo del pedido debe ser un JSON valido"]);
    }
    return $datos;
}

//PDO devuelve los numeros MYSQL como texto ("1", "-34.7000000").
// lo convertimos para el json tenga numeros de verdad, como lo menciona en el contrato.
function formatearCliente($fila) {
    $fila["id"]      = (int) $fila["id"];
    $fila["activo"]  = (int) $fila["activo"];
    $fila["latitud"] = $fila["latitud"] ===null ? null : (float) $fila["latitud"];
    $fila["longitud"] = $fila["longitud"] ===null ? null : (float) $fila["longitud"];
    return $fila;
}

//busca un cliente activo por id; devuelve la fila o false si no existe
function buscarCliente($conexion, $id) {
    $conexion = asegurarConexion($conexion);

    $stmt = $conexion->prepare(
        "SELECT id, nombre, telefono, dni, direccion, ciudad, notas, latitud, longitud, activo
         FROM clientes WHERE id = :id AND activo = 1"
    );
    $stmt->execute([":id" => $id]);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);
    return $fila ? formatearCliente($fila) : false;
}
 
// Obtiene el id de la URL (?id=) y verifica que sea un número
function obtenerId() {
    if (!isset($_GET["id"]) || !ctype_digit($_GET["id"])) {
        responder(400, ["error" => "Falta el id o no es válido"]);
    }
    return (int) $_GET["id"];
}
 
// Valida los datos de un cliente. Si algo esta mal, responde 400 y corta.
// $idActual se usa en PUT para que el DNI del propio cliente no cuente como repetido.
function validarCliente($datos, $conexion, $idActual = null) {
    $conexion = asegurarConexion($conexion);

    $nombre    = trim($datos["nombre"] ?? "");
    $telefono  = trim($datos["telefono"] ?? "");
    $dni       = trim($datos["dni"] ?? "");
    $direccion = trim($datos["direccion"] ?? "");
    $ciudad    = trim($datos["ciudad"] ?? "");
    $notas     = trim($datos["notas"] ?? "");
 
    if ($nombre === "") {
        responder(400, ["error" => "El nombre es obligatorio"]);
    }
    // Largos maximos: son los de las columnas (schema.sql). Si no, MySQL fallaria con un error.
    if (mb_strlen($nombre) > 100 || mb_strlen($direccion) > 150 || mb_strlen($notas) > 255) {
        responder(400, ["error" => "Algun campo supera el largo permitido"]);
    }
    // Solo digitos, entre 10 y 15 (codigo de pais incluido): lo necesita wa.me
    if (!preg_match('/^\d{10,15}$/', $telefono)) {
        responder(400, ["error" => "El telefono debe tener entre 10 y 15 digitos, con codigo de pais"]);
    }
    // El DNI es opcional (hay clientas cargadas sin DNI). Si viene, tiene que ser valido.
    if ($dni !== "" && !preg_match('/^\d{7,8}$/', $dni)) {
        responder(400, ["error" => "El DNI debe tener 7 u 8 dígitos"]);
    }
 
    // DNI repetido (se revisa tambien entre las dadas de baja, porque la columna es UNIQUE)
    // Solo si se informo un DNI: varias clientas sin DNI (NULL) son validas.
    if ($dni !== "") {
        $sql = "SELECT id FROM clientes WHERE dni = :dni";
        $params = [":dni" => $dni];
        if ($idActual !== null) {
            $sql .= " AND id <> :id";
            $params[":id"] = $idActual;
        }
        $stmt = $conexion->prepare($sql);
        $stmt->execute($params);
        if ($stmt->fetch()) {
            responder(400, ["error" => "Ya existe un cliente con ese DNI"]);
        }
    }
 
    return [
        "nombre"    => $nombre,
        "telefono"  => $telefono,
        "dni"       => $dni === "" ? null : $dni,   // vacio se guarda como NULL
        "direccion" => $direccion === "" ? null : $direccion,  // vacio se guarda como NULL
        "ciudad"    => $ciudad === "" ? null : $ciudad,
        "notas"     => $notas === "" ? null : $notas,
    ];
}

//calcula la ubicación de la clienta a partir de la ciudad. Devuelve latitud y longitud.
// Sin ciudad no hay nada que geocodificar, quedaria sin coordenadas.
// Ciudad que no exista 422 el pedido esta bien armado pero el dato no se puede procesar.
// Servicio caido la clienta se guarda igual, sin coordenadas degradacion elegante.
function ubicarCliente($ciudad) {
    if ($ciudad === null) {
        return [null, null];
    } 
    $resultado = geocodificarCiudad($ciudad);
    
    if ($resultado["estado"] === "no_encontrada") {
        responder(422, ["error" => "No se encontró la ciudad indicada. Revisá cómo está escrita."]);
    }
    if ($resultado["estado"] === "servicio_caido") {
        return [null, null];
    }
    return [$resultado["latitud"], $resultado["longitud"]];
}

// ---------- Logica principal ----------
 
$metodo = $_SERVER["REQUEST_METHOD"];
 
try {
    $conexion = asegurarConexion($conexion);

    switch ($metodo) {
 
        case "GET":
            // GET ?id=1 -> un cliente
            if (isset($_GET["id"])) {
                $cliente = buscarCliente($conexion, obtenerId());
                if (!$cliente) {
                    responder(404, ["error" => "Cliente no encontrado"]);
                }
                responder(200, $cliente);
            }
 
            // GET ?buscar=texto -> filtra por nombre o DNI; sin buscar -> todos los activos
            $sql = "SELECT id, nombre, telefono, dni, direccion, ciudad, notas, latitud, longitud, activo
                    FROM clientes WHERE activo = 1";
            $params = [];
            if (isset($_GET["buscar"]) && trim($_GET["buscar"]) !== "") {
                $sql .= " AND (nombre LIKE :buscar1 OR dni LIKE :buscar2)";
                $params[":buscar1"] = "%" . trim($_GET["buscar"]) . "%";
                $params[":buscar2"] = "%" . trim($_GET["buscar"]) . "%";
            }
            $sql .= " ORDER BY nombre";
 
            $stmt = $conexion->prepare($sql);
            $stmt->execute($params);
            responder(200, array_map("formatearCliente", $stmt->fetchAll(PDO::FETCH_ASSOC)));
            break;
 
        case "POST":
            $d = validarCliente(leerCuerpo(), $conexion);
            // si la ciudad no existe, ubicarCliente() cortara con 422 antes de guardar nada.
            [$latitud, $longitud] = ubicarCliente($d["ciudad"]);
 
            $stmt = $conexion->prepare(
                "INSERT INTO clientes (nombre, telefono, dni, direccion, ciudad, notas, latitud, longitud)
                 VALUES (:nombre, :telefono, :dni, :direccion, :ciudad, :notas, :latitud, :longitud)"
            );
            $stmt->execute([
                ":nombre"    => $d["nombre"],
                ":telefono"  => $d["telefono"],
                ":dni"       => $d["dni"],
                ":direccion" => $d["direccion"],
                ":ciudad"    => $d["ciudad"],
                ":notas"     => $d["notas"],
                ":latitud"   => $latitud,
                ":longitud"  => $longitud,
            ]);
 
            // lastInsertId() devuelve el id que MySQL le asigno a la fila nueva
            $nuevo = buscarCliente($conexion, $conexion->lastInsertId());
            responder(201, $nuevo);
            break;
        
        case "PUT":
            $id = obtenerId();
            $actual = buscarCliente($conexion, $id);
            if (!$actual) {
            responder(404, ["error" => "Cliente no encontrado"]);
    }
            $d = validarCliente(leerCuerpo(), $conexion, $id);    
    

            //si la ciudad  no cambió y ya tenia las coordenadas se conservan y asi evita una consulta externa de más
            //Si cambio o nunca se habia logrado ubicar, se vuelve intentar.
            if ($d["ciudad"] === $actual["ciudad"] && $actual["latitud"] !== null) {
                $latitud  = $actual["latitud"];
                $longitud = $actual["longitud"];
            } else {
                [$latitud, $longitud] = ubicarCliente($d["ciudad"]);
            }
 
            $stmt = $conexion->prepare(
                "UPDATE clientes
                 SET nombre = :nombre, telefono = :telefono, dni = :dni,
                     direccion = :direccion, ciudad = :ciudad, notas = :notas, 
                     latitud = :latitud, longitud = :longitud
                 WHERE id = :id"
            );
            $stmt->execute([
                ":nombre"    => $d["nombre"],
                ":telefono"  => $d["telefono"],
                ":dni"       => $d["dni"],
                ":direccion" => $d["direccion"],
                ":ciudad"    => $d["ciudad"],
                ":notas"     => $d["notas"],
                ":latitud"   => $latitud,
                ":longitud"  => $longitud,
                ":id"        => $id,
            ]);
            responder(200, buscarCliente($conexion, $id));
            break;
 
        case "DELETE":
            $id = obtenerId();
            if (!buscarCliente($conexion, $id)) {
                responder(404, ["error" => "Cliente no encontrado"]);
            }
            // Borrado LOGICO: no se elimina la fila, porque el cliente puede tener
            // compras y pagos asociados. Solo se marca como inactivo
            $stmt = $conexion->prepare("UPDATE clientes SET activo = 0 WHERE id = :id");
            $stmt->execute([":id" => $id]);
            responder(204); //204 hecho para no responder ningun contenido.
            break;
 
        default:
            responder(405, ["error" => "Método no permitido"]);
    }

} catch (PDOException $error) {
    // Error inesperado de la base: el detalle va al log, al usuario un mensaje generico
    error_log($error->getMessage());
    responder(500, ["error" => "Error interno del servidor"]);
}
 




