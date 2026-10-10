// sesion.js
// Se incluye en TODAS las pantallas privadas (todas menos login.html).
// 1. Si no hay token, manda al login.
// 2. Le pregunta a la API si el token sigue sirviendo.
// 3. Maneja el botón "Salir".

const URL_API = "../api/";
const token = localStorage.getItem("token");

// Borra lo guardado y vuelve al login
function irAlLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("nombre");
  window.location.href = "login.html";
}

// 1. Sin token no se puede estar acá
if (!token) {
  irAlLogin();
}

// 2. Comprobar con la API que el token sea válido (no vencido ni cerrado)
async function comprobarSesion() {
  try {
    const respuesta = await fetch(URL_API + "sesion.php", {
      headers: { "Authorization": "Bearer " + token },
    });
    if (respuesta.status === 401) {
      irAlLogin();   // vencido o inválido
      return;
    }
    const usuario = await respuesta.json();
    const lugarNombre = document.querySelector("#nombreUsuario");
    if (lugarNombre) lugarNombre.textContent = usuario.nombre;
  } catch (error) {
    console.error("No se pudo comprobar la sesión", error);
  }
}
comprobarSesion();

// 3. Botón "Salir": avisa a la API (borra el token) y vuelve al login
const botonSalir = document.querySelector("#btnSalir");
if (botonSalir) {
  botonSalir.addEventListener("click", async function () {
    try {
      await fetch(URL_API + "sesion.php", {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token },
      });
    } finally {
      irAlLogin();
    }
  });
}