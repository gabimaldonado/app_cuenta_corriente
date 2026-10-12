function hashPrenda(prenda) {
	return prenda.descripcion+" "+prenda.color+" "+prenda.talle.toString();
}

function hashCliente(cliente) {
	return cliente.nombre+" ("+cliente.id+")";
}

async function generarListaOpcionesClientes(elementoDatalist) {
	const clientes = await getClientes();
	const lookupClientes = {};
	elementoDatalist.innerHTML = "";
	clientes.forEach((cliente)=>{
		let opcion = document.createElement("option");
		opcion.setAttribute("value",hashCliente(cliente));
		elementoDatalist.appendChild(opcion);
		lookupClientes[hashCliente(cliente)] = cliente;
	});
	return lookupClientes;
}

function formatearMonto(numero,minDigitos,maxDecimales) {
	let formateador = Intl.NumberFormat(undefined,{minimumIntegerDigits:minDigitos,maximumFractionDigits:maxDecimales});
	return formateador.format(numero);
}

function crearDivInfoPrenda(prenda) {
	const divInfo = document.createElement("div");
	const titulo = document.createElement("h4");
	titulo.innerText = prenda.descripcion;
	divInfo.appendChild(titulo);
	const desc = document.createElement("p");
	desc.innerText = "Talle "+prenda.talle+" - "+prenda.color;
	divInfo.appendChild(desc);

	return divInfo;
}

function crearElementoCarga() {
	const elemento = document.createElement("p");
	elemento.innerText = "Cargando...";
	return elemento;
}

function crearElementoErr(errMsg) {
	const elemento = document.createElement("p");
	elemento.innerText = errMsg;
	elemento.classList.add("error");
	return elemento;
}

const paginas = [
	"paginaInicio",
	"paginaClientes",
	"paginaPrendas"
];

function abrirPagina(id) {
	paginas.forEach((pag)=>{
		const elemento = document.getElementById(pag);
		elemento.hidden = id != pag;
	});
}