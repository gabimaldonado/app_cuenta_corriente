const popupConfirmarEntrega = (()=>{
	let self = {
		popup:document.getElementById("popupConfirmarEntrega"),
		formulario:document.getElementById("CE-formulario"),
		abrir:undefined,
		entregaActual:undefined,
		submitted:false,
	};

	const elementoTitulo = document.getElementById("CE-nombreCliente");	
	self.abrir = async (infoEntrega)=>{
		self.submitted = false;
		self.popup.showModal();

		const infoCliente = await getClienteId(infoEntrega.cliente_id);
		const prendasEntrega = await getPrendasInEntrega(infoEntrega.id);
		self.entregaActual = infoEntrega;
		
		const formateadorFecha = new Intl.DateTimeFormat();
		elementoTitulo.innerText = infoCliente.nombre + " - Entrega del " + formateadorFecha.format(infoEntrega.fecha);
		
		self.formulario.innerHTML = "";
		infoEntrega.entrega_items.forEach((item)=>{
			const infoPrenda = prendasEntrega.find((prenda)=>{return prenda.id == item.producto_id;});
			const elementoPrenda = document.createElement("li");
			elementoPrenda.classList.add("prendaConfirmar");
			const prendaIdHTML=`PRENDA-${item.producto_id}`;
			elementoPrenda.innerHTML = `
				<div class="leftRightFlex">
					<div>
						${crearDivInfoPrenda(infoPrenda).innerHTML}
					</div>
					<p>$ ${formatearMonto(item.precio_unitario,3,1)}</p>
				</div>
				<div class="botonesOpcionMultiple">
					<input type="radio" name="${prendaIdHTML}" id="${prendaIdHTML}-se-queda" value="1" checked>
					<label for="${prendaIdHTML}-se-queda">Se queda</label>
					<input type="radio" name="${prendaIdHTML}" id="${prendaIdHTML}-devuelve" value="2">
					<label for="${prendaIdHTML}-devuelve">Devuelve</label>
				</div>
			`;
			
			self.formulario.appendChild(elementoPrenda);
			
			elementoPrenda.addEventListener("click",()=>{
				actualizarFooter();
			});
		});
		actualizarFooter();
	};

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
	self.abrir = async (nombreCliente)=>{
		self.submitted = false;
		self.popup.showModal();

		if (nombreCliente) {
			busquedaClienta.value = nombreCliente;
		}

		self.prendasSeleccionadas = [];
		opcionesPrendas = {};
		opcionesClientes = await generarListaOpcionesClientes(datalistClientes);
		
		listaPrendas.innerHTML = "";
		datalistPrendas.innerHTML = "";
		const prendas = await getPrendas();
		prendas.forEach((prenda)=>{
			if (prenda.stock <= 0) {
				return;
			}
			const opcion = document.createElement("option");
			opcion.setAttribute("value",hashPrenda(prenda));
			datalistPrendas.appendChild(opcion);
			opcionesPrendas[hashPrenda(prenda)] = prenda;
		});
		actualizarMontos();
	};

	self.popup.addEventListener("close",(event)=>{
		self.prendasSeleccionadas = undefined;
		opcionesPrendas = undefined;
		opcionesClientes = undefined;
	});

	function agregarPrenda(prenda) {
		if (self.prendasSeleccionadas.find((val)=>{return val===prenda;})) {
			return;
		}
		
		self.prendasSeleccionadas.push(prenda);
		const nuevaPrenda = document.createElement("li");
		nuevaPrenda.classList.add("leftRightFlex","prendaNuevaEntrega");
		nuevaPrenda.innerHTML = `
			<div>
				${crearDivInfoPrenda(prenda).innerHTML}
			</div>
			<div class="prendaNuevaEntregaPrecio">
				<p>$ ${formatearMonto(prenda.precio,3,1)}</p>
				<a>X</a>
			</div>
		`;

		const botonBorrar = nuevaPrenda.querySelector("a");
		botonBorrar.addEventListener("click",()=>{
			nuevaPrenda.remove();
			self.prendasSeleccionadas = self.prendasSeleccionadas.filter((element)=>{
				return element != prenda;
			});
			actualizarMontos();
		});

		listaPrendas.appendChild(nuevaPrenda);

		actualizarMontos();
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
	self.abrir = async (nombreCliente)=>{
		self.submitted = false;
		self.popup.showModal();
		opcionesClientes = await generarListaOpcionesClientes(datalistClientes);
		if (nombreCliente) {
			busquedaClienta.value = nombreCliente;
		}
		await actualizarSaldoVisible();
	};

	self.popup.addEventListener("close",(event)=>{
		opcionesClientes = undefined;
		saldoClienta = 0;
	});

	const visSaldo = document.getElementById("RP-saldoCliente");
	const saldoRestante = document.getElementById("RP-saldoRestante")
	async function actualizarSaldoVisible() {
		const clienta = opcionesClientes[busquedaClienta.value];
		if (clienta) {
			const [saldo] = await getDeudaCliente(clienta.id);
			busquedaClienta.setCustomValidity("");
			visSaldo.innerText = "$ "+formatearMonto(saldo,3,2);
			saldoClienta = saldo;
		} else {
			busquedaClienta.setCustomValidity("Por favor seleccione un cliente valido");
			visSaldo.innerText = "Seleccione un cliente.";
			saldoClienta = 0;
		}
		verificarMontoIngresado();
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

	self.formulario.addEventListener("submit",async (event)=>{
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
	self.abrir = async(infoCliente)=>{
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
		const [saldo,compras,pagos] = await getDeudaCliente(self.clienteActual.id);
		saldoCliente.innerText = "$ "+formatearMonto(saldo,3,2);
		descripcionSaldo.innerText = "Compras $ "+formatearMonto(compras,3,2)+" - Pagos $ "+formatearMonto(pagos,3,2);
	}

	const listaEntregas = document.getElementById("DC-listaEntregas");
	async function cargarEntregas() {
		const entregas = await getEntregasCliente(self.clienteActual.id);
		const formateadorFecha = Intl.DateTimeFormat();
		listaEntregas.innerHTML = ""
		entregas.forEach((entrega)=>{
			if (entrega.estado != "abierta") {
				return;
			}
			const cantPrendas = entrega.entrega_items.length;
			
			const nuevaEntrega = document.createElement("li");
			nuevaEntrega.classList.toggle("leftRightFlex");
			nuevaEntrega.innerHTML = `
				<div>
					<p>${cantPrendas.toString()} ${cantPrendas != 1 ? "prendas" : "prenda"} - ${formateadorFecha.format(entrega.fecha)}</p>
				</div>
				<a href="#">Confirmar ></a>
			`;
			
			const botonConfirmar = nuevaEntrega.querySelector("a");
			botonConfirmar.addEventListener("click",(event)=>{
				event.preventDefault();
				popupConfirmarEntrega.abrir(entrega);
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

			listaEntregas.appendChild(nuevaEntrega);
		});
	}

	const listaMovimientos = document.getElementById("DC-listaMovimientos");
	async function cargarMovimientos() {
		const pagos = await getPagosCliente(self.clienteActual.id);
		const entregas = await getEntregasCliente(self.clienteActual.id);
		let movimientosCargados = [];
		
		const formateadorFecha = new Intl.DateTimeFormat();
		pagos.forEach((pago) => {
			const nuevoPago = document.createElement("li");
			nuevoPago.innerHTML = `
				<div>
					<h4>Pago - ${pago.medio}</h4>
					<p>${formateadorFecha.format(pago.fecha)} - ${pago.observacion != undefined ? pago.observacion : "Sin observacion"}</p>
				</div>
				<p>- $ ${formatearMonto(pago.monto,3,2)}</p>
			`;
			nuevoPago.classList.add("leftRightFlex");
			movimientosCargados.push({
				elemento:nuevoPago,
				fecha:pago.fecha
			});
		});

		await Promise.all(entregas.map( async (entrega) => {
			if (entrega.estado == "abierta") {
				return;
			}
			let monto = 0;
			let nombres = "";
			let cantItems = 0;
			
			const prendasEntrega = await getPrendasInEntrega(entrega.id)
			entrega.entrega_items.forEach((item)=>{
				if (item.estado == "devuelta") {
					return;
				}
				const infoPrenda = prendasEntrega.find((prenda)=>{return prenda.id == item.producto_id;});
				monto += item.precio_unitario;
				cantItems++;
				if (cantItems != 1) {
					nombres += ", ";
				}
				nombres += infoPrenda.descripcion;
			});
			const nuevaEntrega = document.createElement("li");
			nuevaEntrega.innerHTML = `
				<div>
					<h4>Compra - ${cantItems} prenda${cantItems != 1 ? "s" : ""}</h4>
					<p>${formateadorFecha.format(entrega.fecha)} - ${nombres}</p>
				</div>
				<p>+ $ ${formatearMonto(monto,3,2)}</p>
			`;
			nuevaEntrega.classList.add("leftRightFlex");
			movimientosCargados.push({
				elemento:nuevaEntrega,
				fecha:entrega.fecha
			});
		}));
		
		movimientosCargados.sort((a,b)=>{
			return  b.fecha.getTime() - a.fecha.getTime();
		});

		listaMovimientos.innerHTML = "";
		movimientosCargados.forEach((info)=>{
			listaMovimientos.appendChild(info.elemento);
		});
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