//ya definida en sesion.js
//const URL_API = "../api/";

async function pedirApi(ruta, metodo = "GET", datos = undefined, abortSignal) {
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
	let json;
	try {
		respuesta = await fetch(URL_API + ruta, opciones);
		// Puede que la respuesta no sea JSON; en ese caso json queda en undefined
		let contentType = respuesta.headers.get("content-type");
		if (contentType != undefined && contentType.includes("application/json")) {
			json = await respuesta.json();
		} else {
			json = undefined;
		}
	} catch (error) {
		//Si cancelamos desde abort controller con .abort, subimos ese error hacia arriba para que pueda manejarse.
		if (error.name === "AbortError") {
			throw error;
		}
		//Cualquier otro error lo consideramos como error de conexion.
		throw new Error("No se pudo conectar con el servidor");
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
function convertirFecha(info) {
	if (info.fecha) {
		info.fecha = new Date(info.fecha.replace(" ", "T"));
	}
	return info;
}

//---------------ENTREGAS---------------//


// Todas las entregas, cada una con su lista entrega_items
async function getEntregas(abortSignal) {
	const entregas = await pedirApi("entregas.php","GET",undefined,abortSignal);
	return entregas.map(convertirFecha);
}

// Una entrega por id (si no existe, la API contesta 404 y esto lanza un error)
async function getEntregaId(id_entrega,abortSignal) {
	const entrega = await pedirApi("entregas.php?id=" + id_entrega,"GET",undefined,abortSignal);
	return convertirFecha(entrega);
}

// Las entregas de una clienta
async function getEntregasCliente(id_cliente,abortSignal) {
	const entregas = await pedirApi("entregas.php?cliente_id=" + id_cliente,"GET",undefined,abortSignal);
	return entregas.map(convertirFecha);
}

// Crea una entrega: la API recibe el id de la clienta y los ids de las prendas
async function postEntrega(cliente, prendas) {
	return await pedirApi("entregas.php", "POST", {
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

	return await pedirApi("confirmar_entrega.php", "PUT", {
		entrega_id: id_entrega,
		items: itemsQueSeQuedan
	});
}

//---------------CLIENTES---------------//

async function getClientes(abortSignal) {
	return await pedirApi("clientes.php","GET",undefined,abortSignal);
}

async function getClienteId(id,abortSignal) {
	return await pedirApi("clientes.php?id="+id,"GET",undefined,abortSignal);
}

async function crearCliente(infoForm) {
	let cliente = {
		nombre:infoForm.get("nombre"),
		telefono:infoForm.get("telefono"),
		dni:infoForm.get("dni"),
		direccion:infoForm.get("direccion"),
		ciudad:infoForm.get("ciudad"),
		notas:infoForm.get("notas"),
	};
	return await pedirApi("clientes.php","POST",cliente);
}

async function updateCliente(infoCliente,infoForm) {
	let cliente = {
		nombre:infoForm.get("nombre"),
		telefono:infoForm.get("telefono"),
		dni:infoForm.get("dni"),
		direccion:infoForm.get("direccion"),
		notas:infoForm.get("notas"),
		ciudad:infoForm.get("ciudad")
	};
	if (!infoForm.get("activo")) {
		return await pedirApi("clientes.php?id="+infoCliente.id,"DELETE");
	}
	return await pedirApi("clientes.php?id="+infoCliente.id,"PUT",cliente);
}

async function deleteCliente(clienteId) {
	return await pedirApi("clientes.php?id="+clienteId,"DELETE");
}

//---------------PRENDAS---------------//

async function getPrendas(abortSignal) {
	return await pedirApi("productos.php","GET",undefined,abortSignal);
}

async function getPrendaId(id_prenda,abortSignal) {
	return await pedirApi("productos.php?id="+id_prenda,"GET",undefined,abortSignal);
}

async function getPrendasInEntrega(id_entrega,abortSignal) {
	let entrega = await getEntregaId(id_entrega,abortSignal);
	let prendas = [];
	await Promise.all(entrega.entrega_items.map(async (item)=>{
		prendas.push(await getPrendaId(item.producto_id,abortSignal));
	}));
	return prendas;
}

async function postPrenda(infoForm) {
	let prenda = {
		descripcion:infoForm.get("descripcion"),
		talle:infoForm.get("talle"),
		color:infoForm.get("color"),
		precio: new Number(infoForm.get("precio")),
		stock: new Number(infoForm.get("stock")),
	};
	return await pedirApi("productos.php","POST",prenda);
}

async function updatePrenda(prendaActual,infoForm) {
	let prenda = {
		descripcion:infoForm.get("descripcion"),
		talle:infoForm.get("talle"),
		color:infoForm.get("color"),
		precio: new Number(infoForm.get("precio")),
		stock: new Number(infoForm.get("stock")),
	};
	if (!infoForm.get("activo")) {
		return await pedirApi("productos.php?id="+prendaActual.id,"DELETE");
	}
	return await pedirApi("productos.php?id="+prendaActual.id,"PUT",prenda);
}

async function deletePrenda(prendaId) {
	return await pedirApi("productos.php?id="+prendaId,"DELETE");
}

//---------------PAGOS---------------//

async function getPagosCliente(cliente_id,abortSignal) {
	let pagos = await pedirApi("pagos.php?cliente_id="+cliente_id,"GET",undefined,abortSignal);
	return pagos.map(convertirFecha);
}

async function postPago(cliente_id,infoForm) {
	let pago = {
		cliente_id:cliente_id,
		monto: new Number(infoForm.get("monto")),
		medio:infoForm.get("medio"),
		observacion:infoForm.get("observacion"),
	}
	return await pedirApi("pagos.php","POST",pago)
}

async function getDeudas(abortSignal) {
	let clientes = await getClientes(abortSignal);
	let deudas = [];
	await Promise.all(clientes.map(async (cliente)=>{
		let resumen = await pedirApi("resumen.php?cliente_id="+cliente.id,"GET",undefined,abortSignal);
		deudas.push(resumen);
	}));
	return deudas;
}

async function getDeudaCliente(id_cliente,abortSignal) {
	let resumen = await pedirApi("resumen.php?cliente_id="+id_cliente,"GET",undefined,abortSignal);
	return [resumen.saldo_actual,resumen.total_compras,resumen.total_pagos];
}