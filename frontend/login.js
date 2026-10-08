// login.js
// Manda email y contraseña a login.php. Si están bien, guarda el token
// en el navegador y lleva al menú.

// Dirección de la API. "../api/" = "subí una carpeta y entrá a api".
// Funciona igual en XAMPP y en el hosting, mientras frontend y api
// estén en el mismo proyecto.
const URL_API = "../api/";

// Si ya hay un token guardado, no hace falta loguearse de nuevo
if (localStorage.getItem("token")) {
  window.location.href = "index.html";
}

document.querySelector("#formLogin").addEventListener("submit", async function (evento) {
  evento.preventDefault();   // que no recargue la página

  const mensaje = document.querySelector("#mensaje");
  mensaje.textContent = "Ingresando…";

  const datos = {
    email:    document.querySelector("#campoEmail").value,
    password: document.querySelector("#campoPassword").value,
  };

  try {
    const respuesta = await fetch(URL_API + "login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    const resultado = await respuesta.json();

    // Si la API respondió con error (400 o 401), lo mostramos y cortamos
    if (!respuesta.ok) {
      mensaje.textContent = resultado.error;
      return;
    }

    // Todo bien: guardar el token y el nombre en el navegador
    localStorage.setItem("token", resultado.token);
    localStorage.setItem("nombre", resultado.nombre);

    // Ir al menú principal
    window.location.href = "index.html";

  } catch (error) {
    // No hubo respuesta (Apache apagado, sin red...)
    mensaje.textContent = "No se pudo conectar con el servidor";
  }
});