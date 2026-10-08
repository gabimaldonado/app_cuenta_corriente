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
	divInfo.innerHTML = `
		<h4>${prenda.descripcion}</h4>
		<p>Talle ${prenda.talle.toString()} - ${prenda.color}</p>
	`;
	return divInfo;
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