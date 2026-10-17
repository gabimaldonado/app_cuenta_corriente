// clientes.js
// Pantalla de clientes: listado con buscador, alta, edición y baja.
// Usa de sesion.js (que se carga antes): URL_API, token e irAlLogin().

// ---------- Elementos de la página ----------
const vistaLista   = document.querySelector("#vistaLista");
const vistaForm    = document.querySelector("#vistaForm");
const buscador     = document.querySelector("#buscador");
const lista        = document.querySelector("#lista");
const mensajeLista = document.querySelector("#mensajeLista");
const formCliente  = document.querySelector("#formCliente");
const tituloForm   = document.querySelector("#tituloForm");
const errorForm    = document.querySelector("#errorForm");
const btnBaja      = document.querySelector("#btnBaja");
 
const campos = {
  nombre:    document.querySelector("#nombre"),
  telefono:  document.querySelector("#telefono"),
  dni:       document.querySelector("#dni"),
  direccion: document.querySelector("#direccion"),
  notas:     document.querySelector("#notas"),
};
 
let idEditando = null;   // null = alta nueva; con número = editando esa clienta.
 
// ----- Listado ------
async function cargarLista() {
  const texto = buscador.value.trim();
  // encodeURIComponent evita que caracteres raros rompan la URL.
  const ruta = "clientes.php" + (texto ? "?buscar=" + encodeURIComponent(texto) : "");
  try {
    const clientes = await pedirApi(ruta);
    mensajeLista.textContent = clientes.length === 0 ? "No se encontraron clientas." : "";
    dibujarLista(clientes);
  } catch (error) {
    lista.replaceChildren();
    mensajeLista.textContent = error.message;
  }
}
 
function iniciales(nombre) {
  return nombre.split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase();
}
 
function dibujarLista(clientes) {
  lista.replaceChildren();
  clientes.forEach(function (c) {
    // Se arma con textContent (no innerHTML) para que un nombre con
    // código HTML no pueda ejecutarse en la página (ataque XSS).
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = iniciales(c.nombre);
 
    const nombre = document.createElement("strong");
    nombre.textContent = c.nombre;
    const detalle = document.createElement("small");
    detalle.textContent = "+" + c.telefono + (c.dni ? " · DNI " + c.dni : "");
    const datos = document.createElement("div");
    datos.className = "datos";
    datos.append(nombre, detalle);
 
    // TODO (con el integrante 4tadeo ): mostrar a la derecha el saldo o "Al día"
    // usando resumen.php, como en el wireframe.
 
    const fila = document.createElement("button");
    fila.type = "button";
    fila.className = "fila";
    fila.append(avatar, datos);
    fila.addEventListener("click", function () { abrirForm(c); });
 
    const item = document.createElement("li");
    item.append(fila);
    lista.append(item);
  });
}
 
// Buscar mientras escribe, pero esperando 300 ms para no pedir en cada tecla.
let esperaBusqueda;
buscador.addEventListener("input", function () {
  clearTimeout(esperaBusqueda);
  esperaBusqueda = setTimeout(cargarLista, 300);
});
 
// ---------- Formulario (alta y edición) ----------
function abrirForm(cliente) {
  idEditando = cliente ? cliente.id : null;
  tituloForm.textContent = cliente ? "Editar clienta" : "Nueva clienta";
  campos.nombre.value    = cliente ? cliente.nombre : "";
  campos.telefono.value  = cliente ? cliente.telefono : "";
  campos.dni.value       = cliente && cliente.dni ? cliente.dni : "";
  campos.direccion.value = cliente && cliente.direccion ? cliente.direccion : "";
  campos.notas.value     = cliente && cliente.notas ? cliente.notas : "";
  errorForm.textContent = "";
  btnBaja.hidden = !cliente;      // "Dar de baja" solo al editar
  vistaLista.hidden = true;
  vistaForm.hidden = false;
}
 
function volverALista() {
  vistaForm.hidden = true;
  vistaLista.hidden = false;
  cargarLista();
}
 
document.querySelector("#btnNueva").addEventListener("click", function () { abrirForm(null); });
document.querySelector("#btnCancelar").addEventListener("click", volverALista);
 
formCliente.addEventListener("submit", async function (evento) {
  evento.preventDefault();   // evita que el navegador recargue la página.
  errorForm.textContent = "";
 
  // Se sacan espacios, +, puntos y guiones: la API espera solo dígitos
  const datos = {
    nombre:    campos.nombre.value.trim(),
    telefono:  campos.telefono.value.replace(/\D/g, ""),
    dni:       campos.dni.value.replace(/\D/g, ""),
    direccion: campos.direccion.value.trim(),
    notas:     campos.notas.value.trim(),
  };
 
  try {
    if (idEditando === null) {
      await pedirApi("clientes.php", "POST", datos);                  // crear
    } else {
      await pedirApi("clientes.php?id=" + idEditando, "PUT", datos);  // editar
    }
    volverALista();
  } catch (error) {
    // Aca aparecen los mensajes de validación de la API (nombre vacío, DNI repetido...)
    errorForm.textContent = error.message;
  }
});
 
// Baja lógica: la clienta deja de verse pero no se borra de la base
btnBaja.addEventListener("click", async function () {
  if (!confirm("¿Dar de baja a esta clienta? Dejará de aparecer en el listado.")) return;
  try {
    await pedirApi("clientes.php?id=" + idEditando, "DELETE");
    volverALista();
  } catch (error) {
    errorForm.textContent = error.message;
  }
});
 
// ---------- Al abrir la pantalla ----------
cargarLista();