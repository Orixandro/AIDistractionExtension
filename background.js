chrome.runtime.onMessage.addListener((mensaje, sender, sendResponse) => {
  if (mensaje.accion === "sumarPeticion") {
    
    // Obtenemos la fecha actual en formato local (ej: "16/6/2026")
    const hoy = new Date().toLocaleDateString();

    // Pedimos tanto las peticiones como la última fecha guardada
    chrome.storage.local.get(["peticionesHechas", "fechaCuota"], (resultado) => {
      let actuales = resultado.peticionesHechas || 0;
      let ultimaFecha = resultado.fechaCuota;

      if (ultimaFecha !== hoy) {
        // 🌟 ¡Cambio de día! Reseteamos el contador a 1 y actualizamos la fecha
        chrome.storage.local.set({ peticionesHechas: 1, fechaCuota: hoy }, () => {
          console.log(`[Background] Nuevo día detectado (${hoy}). Contador reiniciado a 1.`);
          sendResponse({ success: true, total: 1 });
        });
      } else {
        // En el mismo día: sumamos 1 de forma normal
        chrome.storage.local.set({ peticionesHechas: actuales + 1 }, () => {
          console.log(`[Background] RPD actualizado a: ${actuales + 1}`);
          sendResponse({ success: true, total: actuales + 1 });
        });
      }
    });
    
    return true; // Mantiene el canal abierto para el envío de respuestas asíncronas
  }
});