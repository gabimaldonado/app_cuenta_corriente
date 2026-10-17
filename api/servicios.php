<?php
//servicios.php
//llamadas a servicios externos hechas desde el backend.
// Hoy: geocodificación de ciudades con la api de Open-Meteo (gratis y sin clave para uso no comercial)
// se incluye con require_once desde clientes.php.
//Por que se llama desde el back: el resultado latitud y longitud se guarda en la base. 
//Asi el mapa no tiene que volver a consultar el servicio cada vez que se abre, y el navegador no depende de Open-Meteo.
// Degradación elegante:geodificarCiudad() nunca corta la ejecucación. Devuelve un "estado" y quien la llama decide que hacer:
// ok -- se encontró la ciudad: vienen latitud y longitud.
// no encontrada --- el servicio respondio bien pero no existe esa ciudad (la API debe responder 422)
// servicio_caido ---- no hubo respuesta util (sin internet, demora, error del servicio):
// la clienta se guarda igual, sin coordenadas.
//Datos que salen hacia Open-Meteo: solo el nombre de la ciudad. Ningun dato personal.

const GEOCODIFICACION_URL = "https://geocoding-api.open-meteo.com/v1/search";
const GEOCODIFICACION_PAIS = "AR"; // solo recibira resultados de Argentina

//pide la URL a internet con tiempo maximo dce espera, para que una demora del servicio
// externo no deje colgada la Api. Devuelve el texto o null si llega a fallar.
function pedirUrlExterna($url) {
    if (function_exists("curl_init")) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3, // SEGUNDOS PARA CONECTAR
            CURLOPT_TIMEOUT        => 5,  // segundos en total
        ]);
        $respuesta = curl_exec($curl);
        $codigo    = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error     = curl_error($curl);

        if ($respuesta === false || $codigo !== 200) {
            error_log("Servicio externo: falló el pedido (HTTPS $codigo) $error");
            return null;
        }
        return $respuesta;
    }

    //plan b si el servidor no cuenta con cURL.
    $contexto  = stream_context_create(["http" => ["timeout" => 5]]);
    $respuesta = @file_get_contents($url, false, $contexto);
    if ($respuesta === false) {
        error_log("Servicio externo: fallo el pedido con file_get_contents");
        return null;
    }
    return $respuesta;
}

//Busca la ciudad en Open-Meteo. Devuelve siempre un arreglo con la clave "estado":
// ["estado" => "ok",  latitud => ...., "longitud" => ...]
// ["estado" => "no_encontrada"]
// ["estado" => "servicio_caido"]
function geocodificarCiudad($ciudad) {
    $ciudad =  trim($ciudad);

    //la api devuelve vacio con menos de 2 caracteres:
    if (mb_strlen($ciudad) <2) {
        return ["estado" => "no_encontrada"];
    }

    // http_build_query arma y codifica los parametros (tildes, espacios, etc.)
    //se piden varios resultados por que hay ciudades con el mismo nombre en distintos paises
    // y luego elegimos de Argentina.
    $url = GEOCODIFICACION_URL . "?" . http_build_query([
        "name"     => $ciudad,
        "count"    => 20,
        "language" => "es",
    ]);
    $texto = pedirUrlExterna($url);
    if ($texto === null) {
        return ["estado" => "servicio_caido"];
    }

    $datos = json_decode($texto, true);
    if (!is_array($datos)) {
        error_log("Servicio externo: la resouesta de geocodificación no es JSON");
        return ["estado" => "servicio_caido"];
    }

    // si no hay coincidencias, la respuesta no trae lista "results"
    foreach (($datos["results"] ?? []) as $lugar) {
        $pais = $lugar["country_code" ?? ""];
        if ($pais === GEOCODIFICACION_PAIS && isset($lugar["latitude"], $lugar["longitude"])) {
            return [
                "estado"   => "ok",
                "latitud"  => round((float) $lugar["latitude"], 6),
                "longitud" => round((float) $lugar["longitude"], 6),
            ];
        }
    }
    return ["estado" => "no_encontrada"];
}
