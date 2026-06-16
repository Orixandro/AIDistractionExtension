// Función para llamar a la API de Gemini (Mantenemos tu excelente estructura de strings)
async function verificarSiEsEntretenimiento(texto) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Analiza el siguiente título de video y/o nombre de canal de YouTube: "${texto}".
  Determina si pertenece principalmente a la categoría de "entretenimiento" (como videojuegos, humor, memes, vlogs irrelevantes, chismes, series, etc.).
  Responde ÚNICAMENTE con la palabra "SI" si es entretenimiento, o "NO" si es educativo, técnico, informativo o de desarrollo personal. 
  La música NO cuenta como entretenimiento. No añadas nada más.`;

  const MAX_RETRIES = 3;

  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      window.miDataDeGemini = data;

      console.log(`[Filtro API] Respuesta cruda (Intento ${intento}):`, data);

      if (data && data.candidates && data.candidates[0]?.content?.parts?.[0]) {
        const resultado = data.candidates[0].content.parts[0].text.trim().toUpperCase();
        return resultado.includes("SI") ? "SI" : "NO";
      }

      if (data && data.error) {
        if (data.error.code === 503) {
          console.warn(`[Filtro API] Error 503. Intento ${intento} de ${MAX_RETRIES}.`);
          if (intento < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          return "ERROR 503";
        }
        console.warn(`[Filtro API] Error ${data.error.code} en Gemini.`);
        return "ERROR GEMINI";
      }

      console.warn("[Filtro API] Estructura desconocida.");
      return "ERROR INDETERMINADO";

    } catch (error) {
      console.error("Error de red al conectar con Gemini API:", error);
      return "ERROR INDETERMINADO";
    }
  }
  return "ERROR INDETERMINADO";
}

// Función principal que analiza la página actual
async function analizarPagina() {
  if (location.pathname === "/" && !location.search.includes("v=")) {
    // Esto significa: "Estoy en la raíz de youtube, pero la URL NO tiene un vídeo (?v=)"
    console.log("[Filtro] El usuario está en la página de inicio. Saltando.");
    quitarPantallaCarga();
    return;
  }
  if (location.href.includes("/results")) {
    console.log("[Filtro] El usuario está en la página de resultados de búsqueda. Saltando.");
    quitarPantallaCarga(); // Por si acaso
    return; 
  }

  const video = document.querySelector('video');
  if (video) {
    // Esperamos a que el vídeo tenga los metadatos listos para reproducirse
    await new Promise(resolve => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      // Por si acaso ya estuvieran cargados, ponemos un pequeño temporizador de seguridad
      setTimeout(resolve, 500);
    });

    // Ahora ejecutamos la pausa con la seguridad de que el reproductor está inicializado
    video.pause();
    video.addEventListener('play', bloquearPlayTemporal);
  }

  mostrarPantallaCarga();

  // Esperar a que los elementos de YouTube carguen en el DOM
  await new Promise(resolve => setTimeout(resolve, 2000));

  let textoAEvaluar = "";
  
  let nombreCanalElement = document.querySelector("yt-page-header-view-model h1 span");

  let tituloVideoElement = null;
  const esUrlDeVideo = location.href.includes("watch?v=");  
  if (esUrlDeVideo) {
    tituloVideoElement = document.querySelector("#title h1 yt-formatted-string");
  }

  const tituloTexto = tituloVideoElement ? tituloVideoElement.textContent.trim() : "";

  if (tituloTexto !== "") {
    nombreCanalElement = document.querySelector("#text a");
  }

  const canalTexto = nombreCanalElement ? nombreCanalElement.textContent.trim() : "";

  if (tituloTexto !== "" && canalTexto !== "") {
    textoAEvaluar = `Canal: ${canalTexto} Vídeo: ${tituloTexto}`;
  } else if (tituloTexto !== "") {
    textoAEvaluar = `Vídeo: ${tituloTexto}`;
  } else if (canalTexto !== "") {
    textoAEvaluar = `Canal: ${canalTexto}`;
  }

  if (textoAEvaluar.trim() !== "") {
    console.log(`[Filtro] Evaluando: "${textoAEvaluar}"`);

    // --- MOCK DE PRUEBA (Descomenta para usar la IA real) ---
    const esEntretenimiento = await verificarSiEsEntretenimiento(textoAEvaluar);
    // await new Promise(resolve => setTimeout(resolve, 2000));
    // const esEntretenimiento = "SI";
    // --------------------------------------------------------

    // REMOCIÓN DEL FILTRO: El análisis ha terminado, quitamos el hook del reproductor
    if (video) {
       video.removeEventListener('play', bloquearPlayTemporal);
    }

    // Quitamos SIEMPRE la pantalla de carga antes de renderizar el siguiente estado
    quitarPantallaCarga();

    if (esEntretenimiento === "SI") {
      bloquearPantalla();
    } else if (esEntretenimiento.includes("ERROR")) {
      pantallaError(esEntretenimiento); // Le pasamos el tipo de error para que sea informativo
    } else {
      console.log("[Filtro] Contenido permitido.");
      if (video) video.play();
    }

  } else {
    // Si la página no es un vídeo ni un canal (ej. la Home), restauramos todo al instante
    console.warn("[Filtro] La página no contiene vídeo o canal identificable.");
    quitarPantallaCarga();
    if (video) {
      video.removeEventListener('play', bloquearPlayTemporal);
      video.play();
    }
  }
}

function bloquearPlayTemporal(e) {
  e.target.pause();
}

function mostrarPantallaCarga() {
  // Evitamos duplicar la pantalla de carga si ya existiera una por un cambio de página rápido
  if (document.getElementById("pantalla-analisis-gemini")) return;

  const pantallaCarga = document.createElement('div');
  pantallaCarga.id = "pantalla-analisis-gemini";
  pantallaCarga.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background-color: #111; color: #fff; font-family: Arial, sans-serif;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      z-index: 999999;
    ">
      <span style="font-size: 60px; margin-bottom: 20px;">🤖</span>
      <h2 style="font-size: 28px; font-weight: normal; margin: 0;">Analizando contenido con Gemini...</h2>
      <p style="color: #aaa; margin-top: 10px; font-size: 14px;">Espera un momento mientras aseguramos tu productividad.</p>
    </div>
  `;
  document.body.appendChild(pantallaCarga);
}

function quitarPantallaCarga() {
  const pantalla = document.getElementById("pantalla-analisis-gemini");
  if (pantalla) pantalla.remove();
}

function bloquearPantalla() {
  document.body.innerHTML = `
    <div style="
      position: fixed; display: flex; justify-content: center; align-items: center;
      height: 100vh; width: 100vw; background-color: #111; color: #fff;
      font-family: Arial, sans-serif; font-size: 24px; text-align: center; padding: 20px;
    ">
      <div>
        <p>Lo siento, pero este canal o video es de entretenimiento.</p>
      </div>
    </div>
  `;
}

function pantallaError(tipoError) {
  // 1. Limpiamos por completo el body machacándolo con la estructura base (sin el onclick)
  document.body.innerHTML = `
    <div style="
      position: fixed; display: flex; justify-content: center; align-items: center;
      height: 100vh; width: 100vw; background-color: #111; color: #ff6b6b;
      font-family: Arial, sans-serif; font-size: 24px; text-align: center; padding: 20px;
    ">
      <div>
        <p style="font-size: 50px; margin-bottom: 10px;">⚠️</p>
        <p style="margin: 0; font-weight: bold;">No se pudo verificar el contenido</p>
        <p style="color: #999; font-size: 14px; margin-top: 8px;">Motivo: ${tipoError}</p>
        <button id="btn-reintentar-filtro" style="margin-top: 20px; padding: 10px 20px; background-color: #ff6b6b; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Reintentar página</button>
      </div>
    </div>
  `;

  // 2. Buscamos el botón en el DOM recién creado utilizando su ID
  const botonReintentar = document.getElementById("btn-reintentar-filtro");

  // 3. Le asignamos la función de recarga de forma legal y segura
  if (botonReintentar) {
    botonReintentar.addEventListener("click", () => {
      location.reload();
    });
  }
}

// Ejecutar la función al cargar la página
analizarPagina();

// Guardamos la URL actual para saber cuándo cambia de verdad
let urlActual = location.href;

const observer = new MutationObserver(() => {
  // Cada vez que ocurra un cambio en el DOM, comprobamos si la URL de la barra de direcciones ha cambiado
  if (location.href !== urlActual) {
    console.log("[Filtro] Se ha detectado un cambio de página a:", location.href);

    // Actualizamos nuestra variable con la nueva URL
    urlActual = location.href;

    // Lanzamos tu función principal para volver a pausar y analizar con Gemini
    analizarPagina();
  }
});

// Vigilamos el 'document.body' (todo el documento) con 'subtree: true'
// Esto detecta cualquier micro-cambio de navegación que altere el historial de YouTube
observer.observe(document.body, {
  childList: true,
  subtree: true
});