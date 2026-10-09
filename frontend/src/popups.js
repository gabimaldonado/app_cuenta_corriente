const popupConfirmarEntrega = (()=>{
	let self = {
		popup:document.getElementById("popupConfirmarEntrega"),
		formulario:document.getElementById("CE-formulario"),
		abrir:undefined,
		entregaActual:undefined,
		submitted:false,
	};

	const elementoTitulo = document.getElementById("CE-nombreCliente");	
	self.abrir = (infoEntrega,infoCliente)=>{
		self.submitted = false;
		self.popup.showModal();
		self.entregaActual = infoEntrega;
		
		const formateadorFecha = new Intl.DateTimeFormat();
		elementoTitulo.innerText = infoCliente.nombre + " - Entrega del " + formateadorFecha.format(infoEntrega.fecha);
		
		cargarPrendas();
	};
	
	async function cargarPrendas() {
		self.formulario.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		self.formulario.appendChild(elementoCarga);
		descFooter.innerText = "Cargando...";
		deudaFooter.innerText = "Cargando...";

		let prendasEntrega = [];
		try {
			prendasEntrega = await getPrendasInEntrega(self.entregaActual.id);
		} catch (err) {
			self.formulario.appendChild(crearElementoErr("No se han podido cargar los prendas asociadas a esta entrega: "+err));
			descFooter.innerText = "Error de carga";
			deudaFooter.innerText = "Error de carga";
			throw err;
		} finally {
			elementoCarga.remove();
		}
		self.entregaActual.entrega_items.forEach((item)=>{
			const infoPrenda = prendasEntrega.find((prenda)=>{return prenda.id == item.producto_id;});
			self.formulario.appendChild(crearElementoPrenda(item,infoPrenda));
		});
		actualizarFooter();
	}

	function crearElementoPrenda(itemEntrega,infoPrenda) {
		const prendaIdHTML=`PRENDA-${itemEntrega.producto_id}`;
		const elementoPrenda = document.createElement("li");
		elementoPrenda.classList.add("prendaConfirmar");

		const divisorInfo = document.createElement("div");
		elementoPrenda.appendChild(divisorInfo);

		const divInfoPrenda = crearDivInfoPrenda(infoPrenda);
		divisorInfo.appendChild(divInfoPrenda);

		const monto = document.createElement("p");
		monto.innerText = "$ "+formatearMonto(itemEntrega.precio_unitario,3,2);
		divisorInfo.appendChild(monto);

		const divisorBotones = document.createElement("div");
		divisorBotones.classList.add("botonesOpcionMultiple");
		divisorBotones.innerHTML = `
			<input type="radio" name="${prendaIdHTML}" id="${prendaIdHTML}-se-queda" value="1" checked>
			<label for="${prendaIdHTML}-se-queda">Se queda</label>
			<input type="radio" name="${prendaIdHTML}" id="${prendaIdHTML}-devuelve" value="2">
			<label for="${prendaIdHTML}-devuelve">Devuelve</label>
		`
		elementoPrenda.appendChild(divisorBotones);

		divisorBotones.addEventListener("click",()=>{
			actualizarFooter();
		});
		return elementoPrenda;
	}

	self.popup.addEventListener("close",(event)=>{
		self.entregaActual = undefined;
	});

	function getEstadoPrendas() {
		let infoAcumulada = [];
		self.entregaActual.entrega_items.forEach((prenda)=>{
			let estado = undefined
			if (document.getElementById("PRENDA-"+prenda.producto_id+"-se-queda").checked) {
				estado = "comprada";
			} else {
				estado = "devuelta";
			}
			infoAcumulada.push({
				prenda:prenda,
				estado:estado
			})
		});
		return infoAcumulada;
	}

	const deudaFooter = document.getElementById("CE-precioTotal");
	const descFooter = document.getElementById("CE-statsResultado");
	function actualizarFooter() {	
		let deudaTotal = 0;
		let seQueda = 0;
		let devuelve = 0;
		
		let estados = getEstadoPrendas();
		estados.forEach((estado)=>{
			if (estado.estado == "comprada") {
				seQueda++;
				deudaTotal += estado.prenda.precio_unitario;
			} else {
				devuelve++;
			}
		});

		deudaFooter.innerText = "+ $ "+formatearMonto(deudaTotal,3,1);
		descFooter.innerText = "Se queda "+seQueda.toString()+" - Devuelve "+devuelve.toString()+" (vuelven al stock)";
	}

	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		confirmarEntrega(self.entregaActual.id,getEstadoPrendas());
		self.submitted = true;
		self.popup.close();
	});

	return self;
})();

const popupNuevaEntrega = (()=>{
	let self = {
		popup:document.getElementById("popupNuevaEntrega"),
		formulario:document.getElementById("NE-formulario"),
		abrir:undefined,
		prendasSeleccionadas:undefined,
		submitted:false,
	};
	
	const listaPrendas = document.getElementById("NE-listaPrendas");
	
	const busquedaPrenda = document.getElementById("NE-busquedaPrenda");
	const datalistPrendas = document.getElementById("NE-datalistPrendas");

	const busquedaClienta = document.getElementById("NE-busquedaClienta");
	const datalistClientes = document.getElementById("NE-datalistClientes");

	let opcionesPrendas = undefined;
	let opcionesClientes = undefined;
	self.abrir = (nombreCliente)=>{
		self.submitted = false;
		self.popup.showModal();

		if (nombreCliente) {
			busquedaClienta.value = nombreCliente;
		}

		self.prendasSeleccionadas = [];
		listaPrendas.innerHTML = "";

		generarOpciones();
		actualizarMontos();
	};

	self.popup.addEventListener("close",(event)=>{
		self.prendasSeleccionadas = undefined;
		opcionesPrendas = undefined;
		opcionesClientes = undefined;
	});

	const contenedorError = document.getElementById("NE-err")
	async function generarOpciones() {
		contenedorError.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		contenedorError.appendChild(elementoCarga);

		let prendas = undefined;
		try {
			prendas = await getPrendas();
			opcionesClientes = await generarListaOpcionesClientes(datalistClientes);
		} catch (err) {
			contenedorError.appendChild(crearElementoErr("No se han podido cargar las opciones de prendas/clientes seleccionables: "+err));
			throw err;
		} finally {
			elementoCarga.remove();
		}

		
		opcionesPrendas = {};
		datalistPrendas.innerHTML = "";
		prendas.forEach((prenda)=>{
			if (prenda.stock <= 0) {
				return;
			}
			const opcion = document.createElement("option");
			opcion.setAttribute("value",hashPrenda(prenda));
			datalistPrendas.appendChild(opcion);
			opcionesPrendas[hashPrenda(prenda)] = prenda;
		});
	}

	function agregarPrenda(prenda) {
		if (self.prendasSeleccionadas.find((val)=>{return val===prenda;})) {
			return;
		}
		
		self.prendasSeleccionadas.push(prenda);
		listaPrendas.appendChild(crearElementoPrenda(prenda));
		actualizarMontos();
	}

	function crearElementoPrenda(infoPrenda) {
		const nuevaPrenda = document.createElement("li");
		nuevaPrenda.classList.add("leftRightFlex","prendaNuevaEntrega");
		
		const divInfo = crearDivInfoPrenda(infoPrenda);
		nuevaPrenda.appendChild(divInfo);

		const divPrecio = document.createElement("div");
		divPrecio.classList.add("NE-prendaPrecio");
		nuevaPrenda.appendChild(divPrecio);

		const precio = document.createElement("p");
		precio.innerText = "$ "+formatearMonto(infoPrenda.precio,3,2);
		divPrecio.appendChild(precio);

		const botonBorrar = document.createElement("a");
		botonBorrar.innerText = "X";
		divPrecio.appendChild(botonBorrar);
		botonBorrar.addEventListener("click",()=>{
			nuevaPrenda.remove();
			self.prendasSeleccionadas = self.prendasSeleccionadas.filter((element)=>{
				return element != infoPrenda;
			});
			actualizarMontos();
		});

		return nuevaPrenda;
	}

	const cantPrendas = document.getElementById("NE-cantPrendas");
	const totalCostoPrendas = document.getElementById("NE-totalEntrega");
	function actualizarMontos() {
		let total = 0;
		
		cantPrendas.innerText = "Se lleva a probar ("+self.prendasSeleccionadas.length.toString()+")";
		self.prendasSeleccionadas.forEach((prenda)=>{
			total += prenda.precio;
		});
		
		totalCostoPrendas.innerText = "$ "+formatearMonto(total,3,1);
		if (self.prendasSeleccionadas.length <= 0) {
			busquedaPrenda.setCustomValidity("Por favor seleccione al menos 1 prenda");
		} else {
			busquedaPrenda.setCustomValidity("");
		}
	}

	busquedaClienta.addEventListener("input",(event)=>{
		const clienta = opcionesClientes[busquedaClienta.value];
		if (clienta) {
			busquedaClienta.setCustomValidity("");
		} else {
			busquedaClienta.setCustomValidity("Por favor seleccione un cliente valido");
		}
	});

	busquedaPrenda.addEventListener("input",(event)=>{
		const prenda = opcionesPrendas[busquedaPrenda.value];
		if (prenda) {
			agregarPrenda(prenda);
			busquedaPrenda.value = "";
		}
	});

	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		const clienta = opcionesClientes[busquedaClienta.value];
		postEntrega(clienta,self.prendasSeleccionadas);
		self.submitted = true;
		self.popup.close();
	});

	return self;
})();

const popupRegistrarPago = (()=>{
	let self = {
		popup: document.getElementById("popupRegistrarPago"),
		formulario: document.getElementById("RP-formulario"),
		abrir:undefined,
		submitted:false,
	};

	const busquedaClienta = document.getElementById("RP-busquedaClienta");
	const datalistClientes = document.getElementById("RP-datalistClientes")
	const inputMonto = document.getElementById("RP-ingresoMonto");
	let opcionesClientes = undefined;
	let saldoClienta = 0;
	self.abrir = (nombreCliente)=>{
		self.submitted = false;
		self.popup.showModal();
		if (nombreCliente) {
			busquedaClienta.value = nombreCliente;
		}
		cargarOpciones().then(actualizarSaldoVisible);
	};

	self.popup.addEventListener("close",(event)=>{
		opcionesClientes = undefined;
		saldoClienta = 0;
	});
	
	const contenedorErrorOpciones = document.getElementById("RP-errOpciones")
	async function cargarOpciones() {
		contenedorErrorOpciones.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		contenedorErrorOpciones.appendChild(elementoCarga);
		try {
			opcionesClientes = await generarListaOpcionesClientes(datalistClientes);
		} catch (err) {
			contenedorErrorOpciones.appendChild(crearElementoErr("No se han podido cargar los clientes seleccionables: "+err));
			throw err;
		} finally {
			elementoCarga.remove();
		}
	}

	const visSaldo = document.getElementById("RP-saldoCliente");
	const saldoRestante = document.getElementById("RP-saldoRestante")
	async function actualizarSaldoVisible() {
		const clienta = opcionesClientes[busquedaClienta.value];
		let clientaValida = true;
		
		let saldo = undefined;

		if (!clienta) {
			busquedaClienta.setCustomValidity("Por favor seleccione un cliente valido");
			visSaldo.innerText = "Seleccione un cliente.";
			saldoClienta = 0;
			return;
		}
		busquedaClienta.setCustomValidity("Clienta cargandose...");
		visSaldo.innerText = "Cargando...";
		try {
			[saldo] = await getDeudaCliente(clienta.id);
			busquedaClienta.setCustomValidity("");
			visSaldo.innerText = "$ "+formatearMonto(saldo,3,2);
			saldoClienta = saldo;
		} catch (err) {
			busquedaClienta.setCustomValidity("Error de carga, intente nuevamente.");
			visSaldo.innerText = "Error de carga";
			saldoClienta = 0;
			throw err;
		} finally {
			verificarMontoIngresado();
		}
	}

	busquedaClienta.addEventListener("input",(event)=>{
		actualizarSaldoVisible();
	});

	inputMonto.addEventListener("input",(event)=>{
		verificarMontoIngresado();
	});

	function verificarMontoIngresado() {
		if (inputMonto.value <= saldoClienta) {
			inputMonto.setCustomValidity("");
			saldoRestante.innerText = "$ "+formatearMonto(saldoClienta-inputMonto.value,3,2);
		} else {
			inputMonto.setCustomValidity("El monto debe ser menor o igual al saldo");
			saldoRestante.innerText = "Monto Invalido";
		}
	}

	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		const clienta = opcionesClientes[busquedaClienta.value];
		const infoForm = new FormData(self.formulario);
		postPago(clienta.id,infoForm);
		self.submitted = true;
		self.popup.close();
	});

	return self;
})();

const popupNuevoCliente = (()=>{
	let self = {
		popup: document.getElementById("popupNuevoCliente"),
		formulario: document.getElementById("NC-formulario"),
		abrir: undefined,
		submitted: false,
	};
	
	self.abrir = ()=>{
		self.submitted = false;
		self.popup.showModal();
	};
	
	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		const infoForm = new FormData(self.formulario);
		crearCliente(infoForm);
		self.submitted = true;
		self.popup.close();
	});
	return self;
})();

const popupNuevaPrenda = (()=>{
	let self = {
		popup: document.getElementById("popupNuevaPrenda"),
		formulario: document.getElementById("NP-formulario"),
		abrir: undefined,
		submitted: false,
	};

	self.abrir = ()=>{
		self.submitted = false;
		self.popup.showModal();
	};
	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		const infoForm = new FormData(self.formulario);
		postPrenda(infoForm);
		self.submitted = true;
		self.popup.close();
	});
	return self;
})();

const popupDatosCliente = (()=>{
	let self = {
		popup:document.getElementById("popupDatosCliente"),
		abrir:undefined,
		clienteActual:undefined,
		submitted:false,
	};

	const tituloPopup = document.getElementById("DC-nombre");
	const visualizacionTelefonoDni = document.getElementById("DC-numYDni");
	self.abrir = (infoCliente)=>{
		self.submitted = false;
		self.clienteActual = infoCliente;
		tituloPopup.innerText = infoCliente.nombre;
		visualizacionTelefonoDni.innerText = "+"+infoCliente.telefono+" - "+(infoCliente.dni != undefined ? "DNI "+infoCliente.dni : "Sin DNI registrado");

		self.popup.showModal();

		refrescarSaldo();
		cargarEntregas();
		cargarMovimientos();
	};

	self.popup.addEventListener("close",(event)=>{
		self.clienteActual = undefined;
	});

	const saldoCliente = document.getElementById("DC-saldo");
	const descripcionSaldo = document.getElementById("DC-comprasPagos")
	async function refrescarSaldo() {
		saldoCliente.innerText = "Cargando...";
		descripcionSaldo.innerText = "Cargando...";
		try {
			const [saldo,compras,pagos] = await getDeudaCliente(self.clienteActual.id);
			saldoCliente.innerText = "$ "+formatearMonto(saldo,3,2);
			descripcionSaldo.innerText = "Compras $ "+formatearMonto(compras,3,2)+" - Pagos $ "+formatearMonto(pagos,3,2);
		} catch (err) {
			saldoCliente.innerText = "Error de carga";
			descripcionSaldo.innerText = "Error de carga";
			throw err;
		} finally {
			//uuu
		}
	}

	const listaEntregas = document.getElementById("DC-listaEntregas");
	async function cargarEntregas() {
		listaEntregas.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaEntregas.append(elementoCarga);

		let entregas = undefined;
		try {
			entregas = await getEntregasCliente(self.clienteActual.id);
		} catch (err) {
			listaEntregas.appendChild(crearElementoErr("No se han podido cargar las entregas: "+err));
			throw err;
		} finally {
			elementoCarga.remove();
		}

		entregas.forEach((entrega)=>{
			if (entrega.estado != "abierta") {
				return;
			}
			listaEntregas.appendChild(crearElementoEntrega(entrega));
		});
	}

	const formateadorFecha = Intl.DateTimeFormat();
	function crearElementoEntrega(infoEntrega) {
		const cantPrendas = infoEntrega.entrega_items.length;
		
		const nuevaEntrega = document.createElement("li");
		nuevaEntrega.classList.toggle("leftRightFlex");
		
		const divLeft = document.createElement("div");
		nuevaEntrega.appendChild(divLeft);

		const info = document.createElement("p")
		info.innerText = 
			cantPrendas.toString()
			+(cantPrendas != 1 ? " prendas" : " prenda")
			+" - "
			+formateadorFecha.format(infoEntrega.fecha);
		divLeft.appendChild(info);

		
		const botonConfirmar = document.createElement("a");
		botonConfirmar.innerText = "Confirmar >";
		botonConfirmar.href = "#";
		nuevaEntrega.appendChild(botonConfirmar);
		botonConfirmar.addEventListener("click",(event)=>{
			event.preventDefault();
			popupConfirmarEntrega.abrir(infoEntrega,self.clienteActual);
			popupConfirmarEntrega.popup.addEventListener("close",(event)=>{
				if (!popupConfirmarEntrega.submitted) {
					return;
				}
				refrescarSaldo();
				cargarEntregas();
				cargarMovimientos();
				self.submitted = true;
			},{once:true})
		});
		return nuevaEntrega;
	}

	const listaMovimientos = document.getElementById("DC-listaMovimientos");
	async function cargarMovimientos() {
		listaMovimientos.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaMovimientos.appendChild(elementoCarga);

		let pagos,entregas = undefined;
		let movimientosCargados = [];
		try {
			pagos = await getPagosCliente(self.clienteActual.id);
			entregas = await getEntregasCliente(self.clienteActual.id);
			pagos.forEach((pago) => {
				movimientosCargados.push({
					elemento:crearElementoMovimientoPago(pago),
					fecha:pago.fecha
				});
			});
			await Promise.all(entregas.map(async (entrega) => {
				if (entrega.estado == "abierta") {
					return;
				}
				const prendasEntrega = await getPrendasInEntrega(entrega.id)
				movimientosCargados.push({
					elemento:crearElementoMovimientoCompra(entrega,prendasEntrega),
					fecha:entrega.fecha
				});
			}));
		} catch (err) {
			listaEntregas.appendChild(crearElementoErr("No se han podido cargar los movimientos: "+err));
			throw err;
		} finally {
			elementoCarga.remove();
		}

		movimientosCargados.sort((a,b)=>{
			return b.fecha.getTime() - a.fecha.getTime();
		});

		movimientosCargados.forEach((info)=>{
			listaMovimientos.appendChild(info.elemento);
		});
	}

	function crearElementoMovimientoCompra(infoEntrega,prendasEntrega) {
		let monto = 0;
		let nombres = "";
		let cantItems = 0;
		infoEntrega.entrega_items.forEach((item)=>{
			if (item.estado == "devuelta") {
				return;
			}
			monto += item.precio_unitario;
			cantItems++;

			const infoPrenda = prendasEntrega.find((prenda)=>{return prenda.id == item.producto_id;});
			if (cantItems != 1) {
				nombres += ", ";
			}
			nombres += infoPrenda.descripcion;
		});

		const nuevaEntrega = document.createElement("li");
		nuevaEntrega.classList.add("leftRightFlex");

		const divLeft = document.createElement("div");
		nuevaEntrega.appendChild(divLeft);

		const titulo = document.createElement("h4");
		titulo.innerText = 
			"Compra - "
			+cantItems.toString()
			+(cantItems != 1 ? " prendas" : "prenda");
		divLeft.appendChild(titulo);

		const desc = document.createElement("p");
		desc.innerText = formateadorFecha.format(infoEntrega.fecha)+" - "+nombres;
		divLeft.appendChild(desc);

		const visMonto = document.createElement("p");
		visMonto.innerText = "+ $ "+formatearMonto(monto,3,2);
		nuevaEntrega.appendChild(visMonto);
		
		return nuevaEntrega;
	}

	function crearElementoMovimientoPago(infoPago) {		
		const nuevoPago = document.createElement("li");
		nuevoPago.classList.add("leftRightFlex");
		
		const divLeft = document.createElement("div");
		nuevoPago.appendChild(divLeft);

		const titulo = document.createElement("h4");
		titulo.innerText = "Pago - "+infoPago.medio;
		divLeft.appendChild(titulo);

		const desc = document.createElement("p");
		desc.innerText = 
			formateadorFecha.format(infoPago.fecha)
			+" - "
			+(infoPago.observacion != undefined ? infoPago.observacion : "Sin observacion");
		divLeft.appendChild(desc);

		const monto = document.createElement("p");
		monto.innerText = "- $ "+formatearMonto(infoPago.monto,3,2);
		nuevoPago.appendChild(monto);

		return nuevoPago;
	}

	document.getElementById("DC-nuevaEntrega").addEventListener("click",(event)=>{
		popupNuevaEntrega.abrir(hashCliente(self.clienteActual));
		popupNuevaEntrega.popup.addEventListener("close",(event)=>{
			if (!popupNuevaEntrega.submitted) {
				return;
			}
			cargarEntregas();
			self.submitted = true;
		},{once:true});
	});
	document.getElementById("DC-nuevoPago").addEventListener("click",(event)=>{
		popupRegistrarPago.abrir(hashCliente(self.clienteActual));
		popupRegistrarPago.popup.addEventListener("close",(event)=>{
			if (!popupRegistrarPago.submitted) {
				return;
			}
			refrescarSaldo();
			cargarMovimientos();
			self.submitted = true;
		},{once:true});
	});
	document.getElementById("DC-whatsapp").addEventListener("click",(event)=>{
		//qwq
	});

	return self;
})();

const popupDatosPrenda = (()=>{
	let self = {
		popup:document.getElementById("popupDatosPrenda"),
		formulario:document.getElementById("DP-formulario"),
		submitted:false,
		abrir:undefined
	};

	let id_prendaActual = undefined;
	const titulo = document.getElementById("DP-nombre");
	const inputTalle = document.getElementById("DP-talle");
	const inputColor = document.getElementById("DP-color");
	const inputPrecio = document.getElementById("DP-precio");
	const inputStock = document.getElementById("DP-stock");
	self.abrir = (infoPrenda)=>{
		titulo.innerText = infoPrenda.descripcion;
		inputTalle.value = infoPrenda.talle;
		inputColor.value = infoPrenda.color;
		inputPrecio.value = infoPrenda.precio;
		inputStock.value = infoPrenda.stock;
		id_prendaActual = infoPrenda.id;
		self.submitted = false;
		self.popup.showModal();
	};
	self.popup.addEventListener("close",()=>{
		id_prendaActual = undefined;
	});

	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		let infoForm = new FormData(self.formulario);
		updatePrenda(id_prendaActual,infoForm);
		self.submitted = true;
		self.popup.close();
	});

	return self;
})();

function setupPopupGenerics() {
	let elements = document.querySelectorAll(".popup");
	elements.forEach((dialog)=>{
		dialog.addEventListener("click",(event)=>{
			if (event.target == dialog) {
				dialog.close();
			}
		});
		let backButton = dialog.querySelector(".popupBack");
		backButton.addEventListener("click",(event)=>{
			dialog.close();
		});
	});
}

setupPopupGenerics();