
<?php

require_once __DIR__ . '/vendor/autoload.php';

use Google\Auth\Credentials\ServiceAccountCredentials;

function getTokenAcceso(): string
{
    $jsonCredenciales = __DIR__ . '/cuenta-corriente-app-movil-cff00fcc9103.json';

    $scopes = [
        'https://www.googleapis.com/auth/firebase.messaging'
    ];

    $credenciales = new ServiceAccountCredentials(
        $scopes,
        $jsonCredenciales
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

	$tokenAcceso = NULL;
	try {
    	$tokenAcceso = getTokenAcceso();
	} catch (Exception $err) {
		return [];
	}

    $idProyecto = 'cuenta-corriente-app-movil';

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
