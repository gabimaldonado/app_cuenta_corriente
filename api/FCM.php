<?php

require_once __DIR__ . '/vendor/autoload.php';

use Google\Auth\Credentials\ServiceAccountCredentials;

// Las credenciales de la cuenta de servicio de Firebase NO están en el repositorio:
// se leen de la variable de entorno FCM_CREDENCIALES (en Railway, pestaña Variables),
// que tiene el contenido completo del JSON que se descarga de la consola de Firebase.
function leerCredenciales(): array
{
    $json = getenv('FCM_CREDENCIALES');
    if (!$json) {
        throw new Exception('Falta la variable de entorno FCM_CREDENCIALES');
    }
    $credenciales = json_decode($json, true);
    if (!is_array($credenciales) || !isset($credenciales['project_id'])) {
        throw new Exception('FCM_CREDENCIALES no tiene un JSON válido');
    }
    return $credenciales;
}

function getTokenAcceso(array $datosCredenciales): string
{
    $scopes = [
        'https://www.googleapis.com/auth/firebase.messaging'
    ];

    $credenciales = new ServiceAccountCredentials(
        $scopes,
        $datosCredenciales
    );

    $token = $credenciales->fetchAuthToken();

    if (!isset($token['access_token'])) {
        throw new Exception('No se pudo generar la clave de acceso de FCM');
    }

    return $token['access_token'];
}


function enviarNotificacion(
    string $canal,
    string $titulo,
    string $cuerpo
): array {

	// Si falta la configuración o Firebase no responde, no se manda el aviso,
	// pero el pago o la entrega se guardan igual (el error queda en el log).
	try {
		$datosCredenciales = leerCredenciales();
		$tokenAcceso = getTokenAcceso($datosCredenciales);
	} catch (\Throwable $err) {
		error_log('FCM: ' . $err->getMessage());
		return [];
	}

    $idProyecto = $datosCredenciales['project_id'];

    $url = "https://fcm.googleapis.com/v1/projects/{$idProyecto}/messages:send";

    $payload = [
        'message' => [
            'topic' => $canal,
            'notification' => [
                'title' => $titulo,
                'body' => $cuerpo
            ]
        ]
    ];

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $tokenAcceso,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload)
    ]);

    $respuesta = curl_exec($ch);

    if ($respuesta === false) {
        $error = curl_error($ch);
        curl_close($ch);
        //throw new Exception($error);
    }

    $codigoHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    return [
        'codigoHttp' => $codigoHttp,
        'response' => json_decode($respuesta, true)
    ];
}
