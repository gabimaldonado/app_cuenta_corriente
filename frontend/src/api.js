let idEntregaDisponible=4;
let testEntregas = [
	{
		id:1,cliente_id:1,
		fecha: new Date("2026-09-20T10:30:00Z"),
		estado: "cerrada",
		entrega_items:[
			{
				entrega_id:1,producto_id:1,
				precio_unitario:45000.00,
				estado:"comprada"
			},
			{
				entrega_id:1,producto_id:2,
				precio_unitario:15000.00,
				estado:"devuelta"
			},
			{
				entrega_id:1,producto_id:3,
				precio_unitario:18000.00,
				estado:"devuelta"
			},
			{
				entrega_id:1,producto_id:4,
				precio_unitario:65000.00,
				estado:"comprada"
			},
			{
				entrega_id:1,producto_id:5,
				precio_unitario:80000.00,
				estado:"devuelta"
			},
		]
	},
	{
		id:2,cliente_id:2,
		fecha: new Date("2026-09-28T17:00:00Z"),
		estado: "abierta",
		entrega_items:[
			{
				entrega_id:2,producto_id:6,
				precio_unitario:35000.00,
				estado:"en_prueba"
			},
			{
				entrega_id:2,producto_id:7,
				precio_unitario:30000.00,
				estado:"en_prueba"
			}
		]
	},
	{
		id:3,cliente_id:3,
		fecha: new Date("2026-09-15T12:00:00Z"),
		estado: "cerrada",
		entrega_items:[
			{
				entrega_id:3,producto_id:8,
				precio_unitario:55000.00,
				estado:"comprada"
			},
			{
				entrega_id:3,producto_id:2,
				precio_unitario:15000.00,
				estado:"comprada"
			}
		]
	},
];

async function fakeWait(time) {
	await new Promise((resolve)=>setTimeout(resolve, time));
}

async function getEntregas() {
	//todo
	//test data
	await fakeWait(1000)
	return testEntregas;
}
async function getEntregaId(id_entrega) {
	//todo
	//test data
	await fakeWait(1000)
	return testEntregas.find((entrega)=>{ return entrega.id === id_entrega });
}
async function getEntregasCliente(id_cliente) {
	await fakeWait(1000)
	return testEntregas.filter((entrega)=>{ return entrega.cliente_id == id_cliente });
}

async function postEntrega(cliente,prendas) {
	let items = prendas.reduce((acc,prenda)=>{
		acc.push({
			entrega_id:idEntregaDisponible,
			producto_id:prenda.id,
			precio_unitario:prenda.precio,
			estado:"en_prueba"
		});
		return acc;
	},new Array);
	
	testEntregas.push({
		id:idEntregaDisponible,
		cliente_id:cliente.id,
		fecha: new Date(Date.now()),
		estado:"abierta",
		entrega_items:items
	});
	idEntregaDisponible++;
}

async function confirmarEntrega(id_entrega,estados) {
	let entrega = await getEntregaId(id_entrega);
	estados.forEach((estado) => {
		entrega.entrega_items.find((v)=>{return v.producto_id === estado.prenda.producto_id}).estado = estado.estado;
	});
	entrega.estado = "cerrada";
}

let idClienteDisponible = 5;
let testClientes = [
	{
		id:1,
		nombre:'Laura Gómez',
		telefono:'5492914000001',
		dni:'30111222',
		direccion:'Belgrano 123', 
		notas:'Prefiere talle M',
		activo:true,
	},
	{
		id:2,
		nombre:'Marta Fernández',
		telefono:'5492914000002',
		dni:'28333444',
		direccion:'Alsina 456',
		notas:undefined,
		activo:true
	},
	{
		id:3,
		nombre:'Sofía Ruiz',
		telefono:'5492914000003',
		dni:'35555666',
		direccion:'Sarmiento 789',
		notas:'Paga por transferencia',
		activo:true
	},
	{
		id:4,
		nombre:'Carla Pérez',
		telefono:'5492914000004',
		dni:undefined,
		direccion:undefined,
		notas:'Clienta nueva',
		activo:true
	}
];
async function getClientes() {
	//todo
	//test data
	await fakeWait(1000)
	return testClientes;
}

async function getClienteId(id) {
	//todo
	//test data
	await fakeWait(1000)
	return testClientes.find((cliente)=>{ return cliente.id == id });
}

async function crearCliente(infoForm) {
	let cliente = {
		id:idClienteDisponible,
		nombre:infoForm.get("nombre"),
		telefono:infoForm.get("telefono"),
		dni:infoForm.get("dni"),
		direccion:infoForm.get("direccion"),
		notas:infoForm.get("notas"),
		activo:true
	}
	idClienteDisponible++;
	testClientes.push(cliente);
}

let idPagoDisponible = 4;
let testPagos = [
	{
		id:1,cliente_id:1,
		fecha: new Date("2026-09-25T11:00:00Z"),
		monto: 20000.00,
		medio: "efectivo",
		observacion: "Primera cuota"
	},
	{
		id:2,cliente_id:1,
		fecha: new Date("2026-10-01T18:00:00Z"),
		monto: 30000.00,
		medio: "transferencia",
		observacion: undefined
	},
	{
		id:3,cliente_id:3,
		fecha: new Date("2026-09-20T09:00:00Z"),
		monto: 70000.00,
		medio: "transferencia",
		observacion: "Pagó todo"
	},
]

async function postPago(cliente_id,infoForm) {
	let pago = {
		id:idPagoDisponible,
		cliente_id:cliente_id,
		fecha: new Date(Date.now()),
		monto: new Number(infoForm.get("monto")),
		medio:infoForm.get("medio"),
		observacion:infoForm.get("observacion"),
	}
	idPagoDisponible++;
	testPagos.push(pago);
}

async function getPagosCliente(cliente_id) {
	await fakeWait(1000)
	return testPagos.filter((pago)=>{
		return pago.cliente_id == cliente_id
	});
}

async function getDeudas() {
	await fakeWait(1000)
	let deudasTotales = {};
	testEntregas.forEach((entrega)=>{
		if (!deudasTotales[entrega.cliente_id]) {
			deudasTotales[entrega.cliente_id] = {deuda:0, compras:0, pagos:0};
		}
		entrega.entrega_items.forEach((item)=>{
			if (item.estado === "comprada") {
				deudasTotales[entrega.cliente_id].deuda += item.precio_unitario;
				deudasTotales[entrega.cliente_id].compras += item.precio_unitario;
			}
		});
	});
	testPagos.forEach((pago)=>{
		deudasTotales[pago.cliente_id].deuda -= pago.monto;
		deudasTotales[pago.cliente_id].pagos += pago.monto;
	});
	let objetoComoArray = []
	Object.entries(deudasTotales).forEach(([llave,valor])=>{
		objetoComoArray.push({
			cliente_id:llave,
			deuda:valor.deuda,
			compras:valor.compras,
			pagos:valor.pagos
		})
	})
	return objetoComoArray;
}

async function getDeudaCliente(id_cliente) {
	await fakeWait(1000)
	let deudaTotal = 0;
	let compras = 0;
	let pagos = 0;
	testEntregas.forEach((entrega)=>{
		if (entrega.cliente_id != id_cliente) {
			return;
		}
		entrega.entrega_items.forEach((item)=>{
			if (item.estado === "comprada") {
				deudaTotal += item.precio_unitario;
				compras += item.precio_unitario;
			}
		});
	});
	testPagos.forEach((pago)=>{
		if (pago.cliente_id != id_cliente) {
			return;
		}
		deudaTotal -= pago.monto;
		pagos += pago.monto;
	});
	return [deudaTotal,compras,pagos];
}

let idPrendaDisponible = 9;
let testPrendas = [
	{
		id:1,
		descripcion:'Jean recto',
		talle:'38',
		color:'Azul',
		precio:45000.00,
		stock:5
	},
	{
		id:2,
		descripcion:'Remera básica',
		talle:'M',
		color:'Blanca',
		precio:15000.00,
		stock:8
	},
	{
		id:3,
		descripcion:'Remera estampada',
		talle:'S',
		color:'Negra',
		precio:18000.00,
		stock:5
	},
	{
		id:4,
		descripcion:'Campera de jean',
		talle:'M',
		color:'Celeste',
		precio:65000.00,
		stock:2
	},
	{
		id:5,
		descripcion:'Campera inflable',
		talle:'L',
		color:'Negra',
		precio:80000.00,
		stock:2
	},
	{
		id:6,
		descripcion:'Buzo con capucha',
		talle:'M',
		color:'Gris',
		precio:35000.00,
		stock:4
	},
	{
		id:7,
		descripcion:'Pollera plisada',
		talle:'S',
		color:'Beige',
		precio:30000.00,
		stock:3
	},
	{
		id:8,
		descripcion:'Vestido largo',
		talle:'M',
		color:'Verde',
		precio:55000.00,
		stock:2
	}
];
async function getPrendas() {
	//todo
	await fakeWait(1000)
	return testPrendas;
}

async function getPrendaId(id_prenda) {
	//todo
	await fakeWait(1000)
	return testPrendas.find((prenda)=>{ return prenda.id == id_prenda });
}

async function getPrendasInEntrega(id_entrega) {
	await fakeWait(1000)
	let entrega = await getEntregaId(id_entrega);
	let prendas = [];
	await Promise.all(entrega.entrega_items.map(async (item)=>{
		prendas.push(await getPrendaId(item.producto_id));
	}));
	return prendas;
}

async function postPrenda(infoForm) {
	let prenda = {
		id:idPrendaDisponible,
		descripcion:infoForm.get("descripcion"),
		talle:infoForm.get("talle"),
		color:infoForm.get("color"),
		precio: new Number(infoForm.get("precio")),
		stock: new Number(infoForm.get("stock"))
	}
	idPrendaDisponible++;
	testPrendas.push(prenda);
}

async function updatePrenda(id_prenda,infoForm) {
	let prenda = testPrendas.find((v)=>{
		return v.id = id_prenda;
	});
	prenda.talle = infoForm.get("talle");
	prenda.color = infoForm.get("color");
	prenda.precio = new Number(infoForm.get("precio"));
	prenda.stock = new Number(infoForm.get("stock"));
}

let apiURL = "localhost/alumnos.php";
async function fetchTest() {
	try {
		let httpResponse = await fetch(apiURL);
		let json = undefined;
		if (httpResponse.headers["Content-Type"] == "application/json") {
			json = await httpResponse.json();
		}
		if (!httpResponse.ok) {
			console.warn("uh oh");
			throw new Error(json);
		}
		console.log("no problemo");
		return json;
	} catch (e) {
		console.warn("could not do the fetch");
		console.warn(e);
	}
}

fetchTest();