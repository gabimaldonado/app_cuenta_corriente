const paginaInicio = (()=>{
	let self = {
		abrir:undefined,
	};
	
	self.abrir = ()=>{
		abrirPagina("paginaInicio");
		cargarDeudores();
		cargarEntregas();
	};

	const listaEntregas = document.getElementById("PI-listaEntregas");
	const cantEntregas = document.getElementById("PI-cantEntregas");
	async function cargarEntregas() {
		const entregas = await getEntregas();
		listaEntregas.innerHTML = "";
		let entregasAbiertas = 0;
		entregas.forEach(async (info)=>{
			if (info.estado != "abierta") {
				return;
			}
			entregasAbiertas++;
			const cantPrendas = info.entrega_items.length;
			const diffTiempo = info.fecha.getTime() - Date.now();
			const formateadorRelativo = new Intl.RelativeTimeFormat(undefined);
				
			let unidad = undefined;
			let tiempo = undefined;
			if (Math.abs(diffTiempo) >= 1000 * 60 * 60 * 24) { //diferencia de dias
				tiempo = diffTiempo/1000/60/60/24;
				unidad = "day";
			} else if (Math.abs(diffTiempo) >= 1000 * 60 * 60) { //diferencia de horas
				tiempo = diffTiempo/1000/60/60;
				unidad = "hour";
			} else if (Math.abs(diffTiempo) >= 1000 * 60) { //diferencia de minutos
				tiempo = diffTiempo/1000/60;
				unidad = "minute";
			} else { //diferencia de segundos
				tiempo = diffTiempo/1000;
				unidad = "second";
			}
			
			let cliente = await getClienteId(info.cliente_id);

			const elementoLista = document.createElement("li");
			elementoLista.classList.toggle("prueba");
			
			elementoLista.innerHTML = `
				<div>
					<h3>${cliente.nombre}</h3>
					<p>${cantPrendas.toString()} ${cantPrendas != 1 ? "prendas" : "prenda"} - ${formateadorRelativo.format(Math.round(tiempo),unidad)}</p>
				</div>
				<a href="#">Confirmar ></a>
			`;
			
			const botonConfirmar = elementoLista.querySelector("a");
			botonConfirmar.addEventListener("click",(event)=>{
				event.preventDefault();
				popupConfirmarEntrega.abrir(info);
				popupConfirmarEntrega.popup.addEventListener("close",(event)=>{
					if (!popupConfirmarEntrega.submitted) {
						return;
					}
					cargarEntregas();
					cargarDeudores();
				},{once:true});
			});

			listaEntregas.appendChild(elementoLista);
		})
		cantEntregas.innerText = 
			entregasAbiertas.toString()+" "
			+(entregasAbiertas != 1 ? "Entregas abiertas" : "Entrega abierta");
	}

	const listaDeudas = document.getElementById("PI-listaDeudores");
	const montoTotal = document.getElementById("PI-montoTotal");
	const cantClientes = document.getElementById("PI-cantClientes");
	async function cargarDeudores() {
		const deudas = await getDeudas();
		deudas.sort((infoA,infoB) => {
			return (infoB.deuda-infoA.deuda);
		});
		listaDeudas.innerHTML = "";
		let cantDeudores = 0;
		let deudaTotal = 0;
		deudas.forEach(async (info)=>{
			if (info.deuda <= 0) {
				return;
			}
			cantDeudores++;
			deudaTotal += info.deuda;
			let infoCliente = await getClienteId(info.cliente_id);
			const elementoLista = document.createElement("li");
			elementoLista.classList.toggle("deudor");
			elementoLista.innerHTML = `
				<div>
					<img src="#">
					<h3 style="display:inline">${infoCliente.nombre}</h3>
				</div>
				<p class="precioDeuda">$ ${formatearMonto(info.deuda,3,1)}</p>
			`;

			listaDeudas.appendChild(elementoLista);
		});
		montoTotal.innerText = "$ "+formatearMonto(deudaTotal,3,2);
		cantClientes.innerText = 
			"Entre "
			+cantDeudores+" "
			+(cantDeudores != 1 ? "clientes con saldos pendientes" : "cliente con saldo pendiente");
	}

	document.getElementById("PI-nuevaEntrega").addEventListener("click",(event)=>{
		popupNuevaEntrega.abrir();
		popupNuevaEntrega.popup.addEventListener("close",(event)=>{
			if (!popupNuevaEntrega.submitted) {
				return;
			}
			cargarEntregas();
		},{once:true});
	});
	document.getElementById("PI-registrarPago").addEventListener("click",(event)=>{
		popupRegistrarPago.abrir();
		popupRegistrarPago.popup.addEventListener("close",(event)=>{
			if (!popupRegistrarPago.submitted) {
				return;
			}
			cargarDeudores();
		},{once:true});
	});
	document.getElementById("PI-verClientes").addEventListener("click",(event)=>{
		paginaClientes.abrir();
	});

	return self;
})();

const paginaClientes = (()=>{
	let self = {
		abrir:undefined
	};

	self.abrir = ()=>{
		abrirPagina("paginaClientes");
		cargarClientes();
	};

	const divFiltro = document.getElementById("PC-filtrosClientes");
	function getFiltro() {
		return divFiltro.querySelector("input[type=\"radio\"]:checked").value;
	}
	let ultimoFiltro = getFiltro();
	divFiltro.addEventListener("click",(event)=>{
		let nuevoFiltro = getFiltro();
		if (ultimoFiltro != nuevoFiltro) {
			cargarClientes();
		}
		ultimoFiltro = nuevoFiltro;
	});

	function infoFiltrada(filtro,entregas,deuda,infoCliente) {
		switch (filtro) {
			case "1": { //todas
				return false;
			}
			case "2": { //solo endeudadas
				return deuda <= 0;
			}
			case "3": { //solo con prendas a prueba
				let primerEntregaAbierta = entregas.find((infoEntrega)=>{
					return infoCliente.id === infoEntrega.cliente_id && infoEntrega.estado === "abierta";
				})
				return primerEntregaAbierta == undefined;
			}
		}
		return false;
	}

	let busquedaClientes = "";
	const listaClientes = document.getElementById("PC-listaClientes");
	async function cargarClientes() {
		const tipoFiltro = getFiltro();
		const clientes = await getClientes();
		const entregas = await getEntregas();
		const deudas = await getDeudas();
		listaClientes.innerHTML = "";
		clientes.forEach((info)=>{
			let deuda = deudas.find((infoDeuda)=>{
				return infoDeuda.cliente_id == info.id;
			}) ?? {deuda:0};
			deuda = deuda.deuda;
			
			if (infoFiltrada(tipoFiltro,entregas,deuda,info)) {
				return;
			}
			if (
				!info.nombre.toLowerCase().includes(busquedaClientes) 
				&& (!info.dni || !info.dni.toLowerCase().includes(busquedaClientes))
			) {
				return;
			}
			const elementoLista = document.createElement("li");
			elementoLista.classList.toggle("cliente");
			elementoLista.innerHTML = `
				<div>
					<img src="#">
					<h3 style="display:inline">${info.nombre}</h3>
					<p>+ ${info.telefono}</p>
				</div>
				<p class="${deuda > 0 ? "precioDeuda" : ""}">${deuda > 0 ? "$ "+formatearMonto(deuda,3,1) : "Al dia"}</p>
			`;

			listaClientes.appendChild(elementoLista);
			elementoLista.addEventListener("click",(event)=>{
				popupDatosCliente.abrir(info);
				popupDatosCliente.popup.addEventListener("close",(event)=>{
					if (!popupDatosCliente.submitted) {
						return;
					}
					cargarClientes();
				},{once:true});
			});
		});
	}

	const inputBusqueda = document.getElementById("PC-busquedaClientes")
	inputBusqueda.addEventListener("change",(event)=>{
		busquedaClientes = inputBusqueda.value.toLowerCase();
		cargarClientes();
	});

	document.getElementById("PC-nuevoCliente").addEventListener("click",(event)=>{
		popupNuevoCliente.abrir();
		popupNuevoCliente.popup.addEventListener("close",(event)=>{
			if (!popupNuevoCliente.submitted) {
				return;
			}
			cargarClientes();
		},{once:true});
	});

	return self;
})();

const paginaPrendas = (()=>{
	let self = {
		abrir:undefined,
	};

	self.abrir = ()=>{
		abrirPagina("paginaPrendas");
		cargarPrendas();
	};
	
	const divFiltro = document.getElementById("PP-filtrosPrendas");
	function getFiltro() {
		return divFiltro.querySelector("input[type=\"radio\"]:checked").value;
	}

	let ultimoFiltro = getFiltro();
	divFiltro.addEventListener("click",(event)=>{
		let nuevoFiltro = getFiltro();
		if (ultimoFiltro != nuevoFiltro) {
			cargarPrendas();
		}
		ultimoFiltro = nuevoFiltro;
	});

	function infoFiltrada(filtro,prenda) {
		switch (filtro) {
			case "1": { //todas
				return false;
			}
			case "2": { //con stock
				return prenda.stock <= 0;
			}
			case "3": { //sin stock
				return prenda.stock > 0;
			}
		}
		return false;
	}

	let busquedaPrendas = "";
	const listaPrendas = document.getElementById("PP-listaPrendas");
	async function cargarPrendas() {
		const prendas = await getPrendas();
		const tipoFiltro = getFiltro();
		listaPrendas.innerHTML = "";
		prendas.forEach((prenda) => {
			if (infoFiltrada(tipoFiltro,prenda)) {
				return;
			}
			if (
				!prenda.descripcion.toLowerCase().includes(busquedaPrendas)
				&& (!prenda.talle || !prenda.talle.toLowerCase().includes(busquedaPrendas))
				&& (!prenda.color || !prenda.color.toLowerCase().includes(busquedaPrendas))
			) {
				return;
			}
			const liPrenda = document.createElement("li");
			liPrenda.innerHTML = `
				<img src="#">
				<div>
					${crearDivInfoPrenda(prenda).innerHTML}	
				</div>
				<div class="leftRightFlex">
					<p>$ ${formatearMonto(prenda.precio,3,2)}</p>
					<p class="${prenda.stock > 0 ? "" : "precioDeuda"}">${prenda.stock > 0 ? "Stock: "+prenda.stock : "Sin stock"}</p>
				</div>
			`;
			liPrenda.classList.add("prenda");
			liPrenda.addEventListener("click",(event)=>{
				popupDatosPrenda.abrir(prenda);
				popupDatosPrenda.popup.addEventListener("close",(event)=>{
					if (!popupDatosPrenda.submitted) {
						return;
					}
					cargarPrendas();
				},{once:true})
			});
			listaPrendas.appendChild(liPrenda);
		});
	}


	const inputBusqueda = document.getElementById("PP-busquedaPrendas");
	inputBusqueda.addEventListener("change",(event)=>{
		busquedaPrendas = inputBusqueda.value.toLowerCase();
		cargarPrendas();
	});

	document.getElementById("PP-nuevaPrenda").addEventListener("click",(event)=>{
		popupNuevaPrenda.abrir();
		popupNuevaPrenda.popup.addEventListener("close",(event)=>{
			if (!popupNuevaPrenda.submitted) {
				return;
			}
			cargarPrendas();
		},{once:true});
	});

	return self;
})();