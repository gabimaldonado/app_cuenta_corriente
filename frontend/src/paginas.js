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
		listaEntregas.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaEntregas.appendChild(elementoCarga);
		cantEntregas.innerText = "Cargando..."

		let entregas = undefined;
		let entregasAbiertas = 0;
		try {
			entregas = await getEntregas();
			await Promise.all(entregas.map(async (info)=>{
				if (info.estado != "abierta") {
					return;
				}
				entregasAbiertas++;

				let cliente = await getClienteId(info.cliente_id);
				listaEntregas.appendChild(crearElementoEntrega(cliente,info));
			}));
		} catch (err) {
			listaEntregas.appendChild(crearElementoErr("No se han podido cargar todas las entregas: "+err));
			cantEntregas.innerText = "Error de carga"
			throw err;
		} finally {
			elementoCarga.remove();
		}
		cantEntregas.innerText = 
			entregasAbiertas.toString()+" "
			+(entregasAbiertas != 1 ? "Entregas abiertas" : "Entrega abierta");
	}

	function crearElementoEntrega(cliente,entrega) {
		const cantPrendas = entrega.entrega_items.length;
		const diffTiempo = entrega.fecha.getTime() - Date.now();
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
			
		const elementoLista = document.createElement("li");
		elementoLista.classList.toggle("prueba");
		
		const divisorInfoCliente = document.createElement("div");
		elementoLista.appendChild(divisorInfoCliente);
		
		const nombreCliente = document.createElement("h3");
		nombreCliente.innerText = cliente.nombre;
		divisorInfoCliente.appendChild(nombreCliente);

		const visCantPrendas = document.createElement("p");
		visCantPrendas.innerText = 
			cantPrendas.toString()
			+" "
			+(cantPrendas != 1 ? "prendas" : "prenda")
			+" - "
			+formateadorRelativo.format(Math.round(tiempo),unidad);
		divisorInfoCliente.appendChild(visCantPrendas);

			
		const botonConfirmar = document.createElement("a");
		botonConfirmar.innerText = "Confirmar >";
		botonConfirmar.href = "#"
		botonConfirmar.addEventListener("click",(event)=>{
			event.preventDefault();
			popupConfirmarEntrega.abrir(entrega,cliente);
			popupConfirmarEntrega.popup.addEventListener("close",(event)=>{
				if (!popupConfirmarEntrega.submitted) {
					return;
				}
				cargarEntregas();
				cargarDeudores();
			},{once:true});
		});
		elementoLista.appendChild(botonConfirmar);
		return elementoLista;
	}

	const listaDeudas = document.getElementById("PI-listaDeudores");
	const montoTotal = document.getElementById("PI-montoTotal");
	const cantClientes = document.getElementById("PI-cantClientes");
	async function cargarDeudores() {
		listaDeudas.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaDeudas.appendChild(elementoCarga);
		montoTotal.innerText = "Cargando...";
		cantClientes.innerText = "Cargando...";
		
		let deudas = undefined 
		let cantDeudores = 0;
		let deudaTotal = 0;
		try {
			deudas = await getDeudas();
			await Promise.all(deudas.map(async (info)=>{
				if (info.deuda <= 0) {
					return;
				}
				cantDeudores++;
				deudaTotal += info.deuda;
				let infoCliente = await getClienteId(info.cliente_id);

				listaDeudas.appendChild(crearElementoDeudor(info,infoCliente));
			}));
		} catch (err) {
			listaDeudas.appendChild(crearElementoErr("No se han podido cargar todos los deudores: "+err));
			montoTotal.innerText = "Error de carga";
			cantClientes.innerText = "Error de carga";
			throw err;
		} finally {
			elementoCarga.remove();
		}
		deudas.sort((infoA,infoB) => {
			return (infoB.deuda-infoA.deuda);
		});

		
		montoTotal.innerText = "$ "+formatearMonto(deudaTotal,3,2);
		cantClientes.innerText = 
			"Entre "
			+cantDeudores+" "
			+(cantDeudores != 1 ? "clientes con saldos pendientes" : "cliente con saldo pendiente");
	}

	function crearElementoDeudor(infoDeuda,infoCliente) {
		const elementoLista = document.createElement("li");
		elementoLista.classList.toggle("deudor");
		
		const divisorInfoCliente = document.createElement("div");
		elementoLista.appendChild(divisorInfoCliente);

		const imgIcon = document.createElement("img");
		imgIcon.src = "#";
		divisorInfoCliente.appendChild(imgIcon);

		const visNombreCliente = document.createElement("h3");
		visNombreCliente.innerText = infoCliente.nombre;
		divisorInfoCliente.appendChild(visNombreCliente);

		const visDeuda = document.createElement("p");
		visDeuda.innerText = "$ "+formatearMonto(infoDeuda.deuda,3,2);
		visDeuda.classList.add("precioDeuda");
		elementoLista.appendChild(visDeuda);

		return elementoLista;
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
		listaClientes.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaClientes.appendChild(elementoCarga);
		
		const tipoFiltro = getFiltro();
		let clientes,entregas,deudas = undefined;
		try {
			clientes = await getClientes();
			entregas = await getEntregas(); //necesario para el filtrado
			deudas = await getDeudas();
		} catch (err) {
			listaClientes.appendChild(crearElementoErr("No se han podido cargar los clientes: "+err));
			throw err;
		} finally {
			elementoCarga.remove();
		}
	
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
			
			listaClientes.appendChild(crearElementoCliente(info,deuda));
		});
	}

	function crearElementoCliente(infoCliente, deuda) {
		const elementoLista = document.createElement("li");
		elementoLista.classList.toggle("cliente");
		
		const divisorInfoCliente = document.createElement("div");
		elementoLista.appendChild(divisorInfoCliente);

		const imgIcon = document.createElement("img");
		imgIcon.src = "#";
		divisorInfoCliente.appendChild(imgIcon);

		const visNombreCliente = document.createElement("h3");
		visNombreCliente.innerText = infoCliente.nombre;
		divisorInfoCliente.appendChild(visNombreCliente);

		const visTelefono = document.createElement("p");
		visTelefono.innerText = "+ "+infoCliente.telefono;
		divisorInfoCliente.appendChild(visTelefono);

		const visDeuda = document.createElement("p");
		if (deuda > 0) {
			visDeuda.classList.add("precioDeuda");
			visDeuda.innerText = "$ "+formatearMonto(deuda,3,1);
		} else {
			visDeuda.innerText = "Al dia";
		}
		elementoLista.appendChild(visDeuda);

		elementoLista.addEventListener("click",(event)=>{
			popupDatosCliente.abrir(infoCliente);
			popupDatosCliente.popup.addEventListener("close",(event)=>{
				if (!popupDatosCliente.submitted) {
					return;
				}
				cargarClientes();
			},{once:true});
		});

		return elementoLista;
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
		listaPrendas.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaPrendas.appendChild(elementoCarga);

		const tipoFiltro = getFiltro();
		let prendas = undefined;
		try {
			prendas = await getPrendas();
		} catch (err) {
			listaPrendas.appendChild(crearElementoErr("No se han podido cargar las prendas: "+err));
			throw err;
		} finally {
			elementoCarga.remove();
		}
		
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
			
			listaPrendas.appendChild(crearElementoPrenda(prenda));
		});
	}

	function crearElementoPrenda(infoPrenda) {
		const elementoLista = document.createElement("li");
		elementoLista.classList.add("prenda");

		const imgPrincipal = document.createElement("img");
		imgPrincipal.src = "#";
		elementoLista.appendChild(imgPrincipal);

		const divPrenda = crearDivInfoPrenda(infoPrenda);
		elementoLista.appendChild(divPrenda);

		const divisorStockMonto = document.createElement("div");
		divisorStockMonto.classList.add("leftRightFlex");
		elementoLista.appendChild(divisorStockMonto);

		const monto = document.createElement("p");
		monto.innerText = "$ "+formatearMonto(infoPrenda.precio,3,2);
		divisorStockMonto.appendChild(monto);

		const stock = document.createElement("p");
		if (infoPrenda.stock > 0) {
			stock.innerText = "Stock: "+infoPrenda.stock;
		} else {
			stock.classList.add("precioDeuda");
			stock.innerText = "Sin stock";
		}
		divisorStockMonto.appendChild(stock);

		elementoLista.addEventListener("click",(event)=>{
			popupDatosPrenda.abrir(infoPrenda);
			popupDatosPrenda.popup.addEventListener("close",(event)=>{
				if (!popupDatosPrenda.submitted) {
					return;
				}
				cargarPrendas();
			},{once:true})
		});

		return elementoLista;
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