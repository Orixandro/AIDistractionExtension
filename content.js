// Función para llamar a la API de Gemini
async function verificarSiEsEntretenimiento(texto) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Analiza el siguiente título de video y/o nombre de canal de YouTube: "${texto}". 
  Determina si pertenece principalmente a la categoría de "entretenimiento" (como videojuegos, humor, memes, vlogs irrelevantes, chismes, series, etc.). 
  Responde ÚNICAMENTE con la palabra "SI" si es entretenimiento, o "NO" si es educativo, técnico, informativo o de desarrollo personal. No añadas nada más.`;

  const MAX_RETRIES = 3;

  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      window.miDataDeGemini = data;

      console.log(`[Filtro API] Respuesta cruda (Intento ${intento}):`, data);

      // 1. CASO ÉXITO: Estructura correcta de Gemini
      if (data && data.candidates && data.candidates[0]?.content?.parts?.[0]) {
        const resultado = data.candidates[0].content.parts[0].text.trim().toUpperCase();
        if (resultado.includes("SI")) {
            return "SI"
        } else {
            return "NO"
        }
      } 
      
      // 2. CASO ERROR DE LA API DE GOOGLE
      if (data && data.error) {
        if (data.error.code === 503) {
          console.warn(`[Filtro API] Error 503 (Servidor no disponible). Intento ${intento} de ${MAX_RETRIES}.`);
          
          // Si no es el último intento, esperamos 1.5 segundos antes de volver a intentarlo
          if (intento < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue; // Salta al siguiente ciclo del bucle for (reintento)
          } else {
            console.error("[Filtro API] Se agotaron los reintentos para el error 503.");
            return "ERROR 503";
          }
        } else {
          // Si es un error 429 (Cuota) o cualquier otro, NO reintentamos y cortamos aquí
          console.warn(`[Filtro API] Error ${data.error.code} en Gemini. No se reintenta.`);
          return "ERROR GEMINI";
        }
      }

      // 3. CASO RARO: No hay error explícito pero la estructura está rota
      console.warn("[Filtro API] Estructura desconocida o bloqueada por seguridad.");
      return "ERROR INDETERMINADO";

    } catch (error) {
      // Este catch captura errores de RED (por ejemplo, si el usuario se queda sin internet)
      console.error("Error de red al conectar con Gemini API:", error);
      return "ERROR INDETERMINADO"; 
    }
  }
  
  return "ERROR INDETERMINADO";
}

// Función principal que analiza la página actual
async function analizarPagina() {
  // 1. Buscamos inmediatamente el vídeo y lo pausamos para que no empiece a reproducirse
  const video = document.querySelector('video');
  if (video) {
    video.pause();
    video.addEventListener('play', bloquearPlayTemporal);
  }

  // 2. Creamos y mostramos la pantalla de "Analizando" encima de todo
  mostrarPantallaCarga();

  // Esperar un momento a que los elementos de YouTube carguen en el DOM
  await new Promise(resolve => setTimeout(resolve, 3000));

  let textoAEvaluar = "";

  // Declaramos la variable del canal con let porque puede reasignarse
  let nombreCanalElement = document.querySelector("#channel-header #text");
  const tituloVideoElement = document.querySelector("#title h1 yt-formatted-string");
  
  // Si estamos en un vídeo, el selector del canal cambia
  if (tituloVideoElement) {
    nombreCanalElement = document.querySelector("#text a");
  }

  // Extraemos el texto real limpiando los espacios e intros molestos con .trim()
  const tituloTexto = tituloVideoElement ? tituloVideoElement.textContent.trim() : "";
  const canalTexto = nombreCanalElement ? nombreCanalElement.textContent.trim() : "";

  // Construimos el texto a evaluar únicamente si tienen contenido real
  if (tituloTexto !== "" && canalTexto !== "") {
    textoAEvaluar = "Canal: " + canalTexto + " Vídeo: " + tituloTexto;
  } else if (tituloTexto !== "") {
    textoAEvaluar = "Vídeo: " + tituloTexto;
  } else if (canalTexto !== "") {
    textoAEvaluar = "Canal: " + canalTexto;
  }

  // Si el texto final no está vacío, procedemos con la API
  if (textoAEvaluar.trim() !== "") {
    console.log(`[Filtro] Evaluando: "${textoAEvaluar}"`);
    
    // --- MOCK DE PRUEBA (Descomenta la línea de abajo para usar la IA real) ---
    // const esEntretenimiento = await verificarSiEsEntretenimiento(textoAEvaluar);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simula la espera de la API
    const esEntretenimiento = "ERROR INDETERMINADO"; // Declarada correctamente con const
    // ---------------------------------------------------------------------------------

    // Quitamos el bloqueo del evento 'play'
    if (video) {
       video.removeEventListener('play', bloquearPlayTemporal);
    }

    if (esEntretenimiento === "SI") {
      bloquearPantalla();
    } else if (esEntretenimiento.includes("ERROR")) {
      pantallaError();
    } else {
      console.log("[Filtro] Contenido permitido.");
      quitarPantallaCarga();
      if (video) video.play();
    }
  } else {
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
  const pantallaCarga = document.createElement('div');
  pantallaCarga.id = "pantalla-analisis-gemini";
  pantallaCarga.innerHTML = `
    <div style="
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background-color: #111;
      color: #fff;
      font-family: Arial, sans-serif;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      z-index: 999999; /* Por encima de absolutamente todo */
    ">
      <span style="font-size: 60px; margin-bottom: 20px;" class="spinner">🤖</span>
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

// Función para reemplazar el diseño de la página
function bloquearPantalla() {
  document.body.innerHTML = `
    <div style="
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      background-color: #111; 
      color: #fff; 
      font-family: Arial, sans-serif; 
      font-size: 24px; 
      text-align: center;
      padding: 20px;
    ">
      <div>
        <p>Lo siento, pero este canal o video es de entretenimiento.</p>
      </div>
    </div>
  `;
}

function pantallaError() {
  document.body.innerHTML = `
    <div style="
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      background-color: #111; 
      color: #fff; 
      font-family: Arial, sans-serif; 
      font-size: 24px; 
      text-align: center;
      padding: 20px;
    ">
      <div>
        <p>Ha ocurrido un error.</p>
      </div>
    </div>
  `;
}

// Ejecutar la función al cargar la página
analizarPagina();