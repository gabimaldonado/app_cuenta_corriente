// frontend/src/entregas_api.js
// Conecta las pantallas de entregas con la API real (api/entregas.php y
// api/confirmar_entrega.php).
//
// Se carga DESPUÉS de api.js: como las funciones se llaman igual, estas
// reemplazan a las de api.js que trabajan con datos de prueba.

// Misma ruta que usa login.js: "../api/" = subí una carpeta y entrá a api
const URL_API_ENTREGAS = "../api/";

// Manda un pedido a la API con el token y devuelve el JSON de la respuesta.
// Si la API contesta con error (400, 404, 409, 500...), lanza un Error con
// el mensaje que mandó el servidor, para que la pantalla lo muestre.
async function pedirApiEntregas(ruta, metodo = "GET", datos = undefined, abortSignal) {
	const opciones = {
		method: metodo,
		headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
		signal: abortSignal
	};
	if (datos !== undefined) {
		opciones.headers["Content-Type"] = "application/json";
		opciones.body = JSON.stringify(datos);
	}

	// fetch solo falla si no hubo respuesta (Apache apagado, sin red...)
	let respuesta;
	try {
		respuesta = await fetch(URL_API_ENTREGAS + ruta, opciones);
	} catch (error) {
		throw new Error("No se pudo conectar con el servidor");
	}

	// Puede que la respuesta no sea JSON; en ese caso json queda en undefined
	let json = undefined;
	try {
		json = await respuesta.json();
	} catch (error) {
		json = undefined;
	}

	// 401: el token falta o venció, hay que volver a loguearse
	if (respuesta.status === 401) {
		localStorage.removeItem("token");
		localStorage.removeItem("nombre");
		window.location.href = "login.html";
		throw new Error("Sesión vencida. Iniciá sesión de nuevo.");
	}

	// fetch NO falla con un 404 o un 400: hay que revisar respuesta.ok
	if (!respuesta.ok) {
		throw new Error(json && json.error ? json.error : "Error " + respuesta.status);
	}

	return json;
}

// La API manda la fecha como texto ("2026-09-28 17:00:00") y las pantallas
// necesitan un objeto Date (usan .getTime() y Intl.DateTimeFormat).
function convertirEntrega(entrega) {
	entrega.fecha = new Date(entrega.fecha.replace(" ", "T"));
	return entrega;
}

// ---------- Funciones que reemplazan a las de api.js ----------

// Todas las entregas, cada una con su lista entrega_items
async function getEntregas(abortSignal) {
	const entregas = await pedirApiEntregas("entregas.php","GET",undefined,abortSignal);
	return entregas.map(convertirEntrega);
}

// Una entrega por id (si no existe, la API contesta 404 y esto lanza un error)
async function getEntregaId(id_entrega,abortSignal) {
	const entrega = await pedirApiEntregas("entregas.php?id=" + id_entrega,"GET",undefined,abortSignal);
	return convertirEntrega(entrega);
}

// Las entregas de una clienta
async function getEntregasCliente(id_cliente,abortSignal) {
	const entregas = await pedirApiEntregas("entregas.php?cliente_id=" + id_cliente,"GET",undefined,abortSignal);
	return entregas.map(convertirEntrega);
}

// Crea una entrega: la API recibe el id de la clienta y los ids de las prendas
async function postEntrega(cliente, prendas) {
	return await pedirApiEntregas("entregas.php", "POST", {
		cliente_id: cliente.id,
		productos: prendas.map((prenda) => prenda.id)
	});
}

// Confirma la compra: la API recibe SOLO los ids de los ítems que la clienta
// se queda. Los demás de esa entrega los marca como devueltos ella misma.
async function confirmarEntrega(id_entrega, estados) {
	const itemsQueSeQuedan = estados
		.filter((estado) => estado.estado === "comprada")
		.map((estado) => estado.prenda.id);

	return await pedirApiEntregas("confirmar_entrega.php", "PUT", {
		entrega_id: id_entrega,
		items: itemsQueSeQuedan
	});
}
