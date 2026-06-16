// Este código corre inmediatamente al abrir la ventanita del icono
document.addEventListener("DOMContentLoaded", () => {
  const contadorElemento = document.getElementById("num-peticiones");

  // Leemos la clave 'peticionesHechas' desde el almacenamiento de la extensión
  chrome.storage.local.get(["peticionesHechas"], (resultado) => {
    // Si la extensión se acaba de instalar y aún no hay datos, recurrimos a 0 por defecto
    const totalPeticiones = resultado.peticionesHechas || 0;
    
    // Inyectamos el número de forma limpia en el HTML
    contadorElemento.textContent = totalPeticiones;
  });
});