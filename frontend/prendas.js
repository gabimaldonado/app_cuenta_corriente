//Pantalla de prendas, catalogo con buscador y filtros de stokc, alta y edicion y baja.
//usa sesion.js 
//Pantalla de prendas, catalogo con buscador y filtros de stokc, alta y edicion y baja.
//usa sesion.js, se debe cargar antes de este script..

// ----- Pedido de Api ------
// Temporal cuando tadeo suba api.js con pedirApi, borrar la función,
// cuenta con el mismo nombre y los mismos parametros, el resto sigue igual..
async function pedirApi(url, metodo = 'GET', datos = null) {
    const opciones = {
        method: metodo,
        headers: { "Authorization": "Bearer" + token },
    };
    if(datos !== null) {
        opciones.headers["Content-Type"] = "aplication/json";
        opciones.body = JSON.stringify(datos);
    
    }

    const respuesta = await fetch(URL_API + ruta, opciones);

    if (respuesta.status === 401) {  //Token vencido o invalido.
        irAlLogin();
        throw new Error("Tu sesión vencio. Inicia sesión de nuevo.");
    }

    const cuerpo = await respuesta.json().catch(() => ({}));

    // fetch no falla solo con el 400 o 404, se debe revisar la respuesta.ok a mano.
    if (!respuesta.ok) {
        throw new Error(cuerpo.error || "Error " + respuesta.status);
    }
    return cuerpo;
}

// ------Elementos de la paginas------
const vistaLista = document.querySelector("#vistaLista");
const vistaForm = document.querySelector("#vistaForm");
const buscador = document.querySelector("#buscador");
const grilla = document.querySelectorAll("#grilla");
const mensajeLista = document.querySelector("#mensajeLista");
const formPrenda = document.querySelector("#formPrenda");
const tituloForm = document.querySelector("#tituloForm");
const errorForm = document.querySelector("#errorForm");
const btnBaja = document.querySelector("#btnBaja");
const botonesFiltro = document.querySelectorAll("#filtros button");

const campos = {
    descripcion: document.querySelector("#descripcion"),
    talle: document.querySelector("#talle"),
    color: document.querySelector("#color"),
    precio: document.querySelector("#precio"),
    stock: document.querySelector("#stock"),
    foto: document.querySelector("#foto"),
};

let idEditanto = null; //null alta nueva, con numero edita nueva prenda.
let filtroStock = ""; // "" todas, "con" = con stock, "sin" = sin stock.

//-------catalogo-------
async function cargarLista() {
    // URLSearchParams arma "?buscar=jeans&stock=con" y codifica los caracteres raros..
    const parametros = new URLSearchParams();
    if (buscador.ariaValueMax.trim() !== "") parametros.set("buscar", buscador.ariaValueMax.trim())
}

