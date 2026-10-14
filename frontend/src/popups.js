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
	
	let abortCargaPrendas = undefined;
	async function cargarPrendas() {
		abortCargaPrendas = manejarAbort(abortCargaPrendas);

		self.formulario.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		self.formulario.appendChild(elementoCarga);
		descFooter.innerText = "Cargando...";
		deudaFooter.innerText = "Cargando...";

		let prendasEntrega = [];
		try {
			prendasEntrega = await getPrendasInEntrega(self.entregaActual.id,abortCargaPrendas.signal);
		} catch (err) {
			if (err.name != "AbortError") {
				self.formulario.appendChild(crearElementoErr("No se han podido cargar las prendas asociadas a esta entrega: "+err));
				descFooter.innerText = "Error de carga";
				deudaFooter.innerText = "Error de carga";
			}
			return;
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

		// Aviso de error que se ve arriba del formulario si la API rechaza la confirmación
	const avisoError = document.createElement("div");
	self.formulario.before(avisoError);

	self.popup.addEventListener("close", ()=>{
		avisoError.innerHTML = "";
	});

	self.formulario.addEventListener("submit", async (event)=>{
		event.preventDefault();
		avisoError.innerHTML = "";
		try {
			await confirmarEntrega(self.entregaActual.id, getEstadoPrendas());
		} catch (err) {
			avisoError.appendChild(crearElementoErr("No se pudo confirmar la entrega: " + err.message));
			return;
		}
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
	let abortCargaOpciones = undefined;
	async function generarOpciones() {
		abortCargaOpciones = manejarAbort(abortCargaOpciones);

		contenedorError.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		contenedorError.appendChild(elementoCarga);

		let prendas = undefined;
		try {
			prendas = await getPrendas(abortCargaOpciones.signal);
			opcionesClientes = await generarListaOpcionesClientes(datalistClientes,abortCargaOpciones.signal);
		} catch (err) {
			if (err.name != "AbortError") {
				contenedorError.appendChild(crearElementoErr("No se han podido cargar las opciones de prendas/clientes seleccionables: "+err));
			}
			return;
		} finally {
			elementoCarga.remove();
		}

		
		opcionesPrendas = {};
		datalistPrendas.innerHTML = "";
		prendas.forEach((prenda)=>{
			if (!prenda.activo) {
				return;
			}

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

		self.formulario.addEventListener("submit", async (event)=>{
		event.preventDefault();
		const clienta = opcionesClientes[busquedaClienta.value];
		contenedorError.innerHTML = "";
		try {
			await postEntrega(clienta, self.prendasSeleccionadas);
		} catch (err) {
			contenedorError.appendChild(crearElementoErr("No se pudo guardar la entrega: " + err.message));
			return;
		}
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
	let abortCargaOpciones = undefined;
	async function cargarOpciones() {
		abortCargaOpciones = manejarAbort(abortCargaOpciones);

		contenedorErrorOpciones.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		contenedorErrorOpciones.appendChild(elementoCarga);
		try {
			opcionesClientes = await generarListaOpcionesClientes(datalistClientes,abortCargaOpciones.signal);
		} catch (err) {
			if (err.name != "AbortError") {
				contenedorErrorOpciones.appendChild(crearElementoErr("No se han podido cargar los clientes seleccionables: "+err));
			}
			return;
		} finally {
			elementoCarga.remove();
		}
	}

	const visSaldo = document.getElementById("RP-saldoCliente");
	const saldoRestante = document.getElementById("RP-saldoRestante")
	let abortCargaSaldo = undefined;
	async function actualizarSaldoVisible() {
		abortCargaSaldo = manejarAbort(abortCargaSaldo);

		const clienta = opcionesClientes[busquedaClienta.value];
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
			[saldo] = await getDeudaCliente(clienta.id,abortCargaSaldo.signal);
			busquedaClienta.setCustomValidity("");
			visSaldo.innerText = "$ "+formatearMonto(saldo,3,2);
			saldoClienta = saldo;
		} catch (err) {
			if (err.name != "AbortError") {
				busquedaClienta.setCustomValidity("Error de carga, intente nuevamente.");
				visSaldo.innerText = "Error de carga";
			}
			saldoClienta = 0;
			return;
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

const actualizarDatosCliente = (()=>{
	let self = {
		popup:document.getElementById("popupEditarDatosCliente"),
		formulario:document.getElementById("EDC-formulario"),
		submitted:false,
		abrir:undefined,
		resultado:undefined
	};

	let clienteActual = undefined;
	const titulo = document.getElementById("EDC-nombre")
	const inputTelefono = document.getElementById("EDC-telefono");
	const inputDNI = document.getElementById("EDC-dni");
	const inputDireccion = document.getElementById("EDC-direccion");
	const inputCiudad = document.getElementById("EDC-ciudad");
	const inputNotas = document.getElementById("EDC-notas");
	const inputActivo = document.getElementById("EDC-activo")
	self.abrir = (infoCliente)=>{
		titulo.innerText = "Editando: "+infoCliente.nombre;
		inputTelefono.value = infoCliente.telefono;
		inputDNI.value = infoCliente.dni ?? "";
		inputDireccion.value = infoCliente.direccion ?? "";
		inputCiudad.value = infoCliente.ciudad ?? "";
		inputNotas.value = infoCliente.notas ?? "";
		inputActivo.checked = infoCliente.activo ?? false;
		clienteActual = infoCliente;
		self.submitted = false;
		self.resultado = undefined;
		self.popup.showModal();
	};
	self.popup.addEventListener("close",()=>{
		clienteActual = undefined;
	});

	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		let infoForm = new FormData(self.formulario);
		self.resultado = updateCliente(clienteActual,infoForm);
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
	const visualizacionNota = document.getElementById("DC-notas")
	self.abrir = (infoCliente)=>{
		self.submitted = false;
		refrescarCliente(infoCliente)
		self.popup.showModal();

		refrescarSaldo();
		cargarEntregas();
		cargarMovimientos();
	};

	self.popup.addEventListener("close",(event)=>{
		self.clienteActual = undefined;
	});

	function refrescarCliente(nuevaInfo) {
		self.clienteActual = nuevaInfo;
		tituloPopup.innerHTML = "";
		tituloPopup.innerText = nuevaInfo.nombre+" ";
		if (!nuevaInfo.activo) {
			let visInactivo = document.createElement("span");
			visInactivo.style.color = "red";
			visInactivo.innerText = "(Inactivo)";
			tituloPopup.appendChild(visInactivo);
		}
		visualizacionTelefonoDni.innerText = "+"+nuevaInfo.telefono+" - "+(nuevaInfo.dni != undefined ? "DNI "+nuevaInfo.dni : "Sin DNI registrado");
		visualizacionNota.innerText = nuevaInfo.notas ?? "Sin nota";
	}

	const saldoCliente = document.getElementById("DC-saldo");
	const descripcionSaldo = document.getElementById("DC-comprasPagos")
	let abortCargaSaldo = undefined;
	async function refrescarSaldo() {
		abortCargaSaldo = manejarAbort(abortCargaSaldo);

		saldoCliente.innerText = "Cargando...";
		descripcionSaldo.innerText = "Cargando...";
		try {
			const [saldo,compras,pagos] = await getDeudaCliente(self.clienteActual.id,abortCargaSaldo.signal);
			saldoCliente.innerText = "$ "+formatearMonto(saldo,3,2);
			descripcionSaldo.innerText = "Compras $ "+formatearMonto(compras,3,2)+" - Pagos $ "+formatearMonto(pagos,3,2);
		} catch (err) {
			if (err.name != "AbortError") {
				saldoCliente.innerText = "Error de carga";
				descripcionSaldo.innerText = "Error de carga";
			}
			return;
		} finally {
			//uuu
		}
	}

	const listaEntregas = document.getElementById("DC-listaEntregas");
	let abortCargaEntregas = undefined;
	async function cargarEntregas() {
		abortCargaEntregas = manejarAbort(abortCargaEntregas);

		listaEntregas.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaEntregas.append(elementoCarga);

		let entregas = undefined;
		try {
			entregas = await getEntregasCliente(self.clienteActual.id,abortCargaEntregas.signal);
		} catch (err) {
			if (err.name != "AbortError") {
				listaEntregas.appendChild(crearElementoErr("No se han podido cargar las entregas: "+err));
			}
			return;
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
	let abortCargaMovimientos = undefined;
	async function cargarMovimientos() {
		abortCargaMovimientos = manejarAbort(abortCargaMovimientos);

		listaMovimientos.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		listaMovimientos.appendChild(elementoCarga);

		let pagos,entregas = undefined;
		let movimientosCargados = [];
		try {
			pagos = await getPagosCliente(self.clienteActual.id,abortCargaMovimientos.signal);
			entregas = await getEntregasCliente(self.clienteActual.id,abortCargaMovimientos.signal);
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
				const prendasEntrega = await getPrendasInEntrega(entrega.id,abortCargaMovimientos.signal)
				movimientosCargados.push({
					elemento:crearElementoMovimientoCompra(entrega,prendasEntrega),
					fecha:entrega.fecha
				});
			}));
		} catch (err) {
			if (err.name != "AbortError") {
				listaEntregas.appendChild(crearElementoErr("No se han podido cargar los movimientos: "+err));
			}
			return;
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
			+(infoPago.observacion ?? "Sin observacion");
		divLeft.appendChild(desc);

		const monto = document.createElement("p");
		monto.innerText = "- $ "+formatearMonto(infoPago.monto,3,2);
		nuevoPago.appendChild(monto);

		return nuevoPago;
	}

	document.getElementById("DC-nuevaEntrega").addEventListener("click",(event)=>{
		if (!self.clienteActual.activo) {
			return;
		}
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
		if (!self.clienteActual.activo) {
			return;
		}
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
		if (!self.clienteActual.activo) {
			return;
		}
		//qwq
	});
	document.getElementById("DC-editar").addEventListener("click",(event)=>{
		actualizarDatosCliente.abrir(self.clienteActual);
		actualizarDatosCliente.popup.addEventListener("close",(event)=>{
			if (!actualizarDatosCliente.submitted) {
				return;
			}
			actualizarDatosCliente.resultado.then(refrescarCliente);
			self.submitted = true;
		})
	})

	return self;
})();

const popupDatosPrenda = (()=>{
	let self = {
		popup:document.getElementById("popupDatosPrenda"),
		formulario:document.getElementById("DP-formulario"),
		submitted:false,
		abrir:undefined
	};

	let prendaActual = undefined;
	const titulo = document.getElementById("DP-nombre");
	const inputTalle = document.getElementById("DP-talle");
	const inputColor = document.getElementById("DP-color");
	const inputPrecio = document.getElementById("DP-precio");
	const inputStock = document.getElementById("DP-stock");
	const inputActivo = document.getElementById("DP-activo")
	self.abrir = (infoPrenda)=>{
		titulo.innerText = infoPrenda.descripcion;
		inputTalle.value = infoPrenda.talle ?? "";
		inputColor.value = infoPrenda.color ?? "";
		inputPrecio.value = infoPrenda.precio ?? 0;
		inputStock.value = infoPrenda.stock ?? 0;
		inputActivo.checked = infoPrenda.activo ?? false;
		prendaActual = infoPrenda;
		self.submitted = false;
		self.popup.showModal();
	};
	self.popup.addEventListener("close",()=>{
		prendaActual = undefined;
	});

	self.formulario.addEventListener("submit",(event)=>{
		event.preventDefault();
		let infoForm = new FormData(self.formulario);
		updatePrenda(prendaActual,infoForm);
		self.submitted = true;
		self.popup.close();
	});

	return self;
})();

const popupMapaClientes = (()=>{
	let self = {
		popup:document.getElementById("popupMapaClientes"),
		elementoMapa:document.getElementById("MC-mapaLeaflet"),
		abrir:undefined,
		mapa:undefined
	};
	self.mapa = new L.LeafletMap(self.elementoMapa).setView([-34.6037, -58.3816], 13);
	new L.TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(self.mapa);

	self.abrir = () => {
		self.popup.showModal();
		cargarClientes();
	};

	self.marcadoresActuales = [];
	const divErr = document.getElementById("MC-err");
	let abortCargaClientes = undefined;
	async function cargarClientes() {
		abortCargaClientes = manejarAbort(abortCargaClientes);

		self.marcadoresActuales.forEach((marcador)=>{
			marcador.remove();
		});
		self.marcadoresActuales = [];
		divErr.innerHTML = "";
		let elementoCarga = crearElementoCarga();
		divErr.appendChild(elementoCarga);
		let clientes = undefined;
		try {
			clientes = await getClientes(abortCargaClientes.signal);
		} catch (err) {
			if (err.name != "AbortError") {
				divErr.appendChild(crearElementoErr("No se han podido cargar los clientes: "+err));
			}
			return;
		} finally {
			elementoCarga.remove();
		}

		clientes.forEach((cliente)=>{
			if (cliente.longitud == undefined || cliente.latitud == undefined) {
				return;
			}
			let coordenadas = [cliente.latitud,cliente.longitud];
			let marcador = new L.Marker(coordenadas);
			marcador.addTo(self.mapa)
			marcador.bindPopup(cliente.nombre+", "+cliente.direccion)
			self.marcadoresActuales.push(marcador);
		});
		if (self.marcadoresActuales.length <= 0) {
			divErr.appendChild(crearElementoErr("No hay clientes con ubicacion para mostrar"));
		} else {
			self.mapa.setView(self.marcadoresActuales[0].getLatLng(),10)
			self.marcadoresActuales[0].openPopup();
		}
	}

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