// Función para llamar a la API de Gemini
async function verificarSiEsEntretenimiento(texto) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `Analiza el siguiente título de video o nombre de canal de YouTube: "${texto}". 
  Determina si pertenece principalmente a la categoría de "entretenimiento" (como videojuegos, humor, memes, vlogs irrelevantes, chismes, series, etc.). 
  Responde ÚNICAMENTE con la palabra "SI" si es entretenimiento, o "NO" si es educativo, técnico, informativo o de desarrollo personal. No añadas nada más.`;

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
    const resultado = data.candidates[0].content.parts[0].text.trim().toUpperCase();
    return resultado.includes("SI");
  } catch (error) {
    console.error("Error al conectar con Gemini API:", error);
    return false; // En caso de error, no bloquea por defecto
  }
}

// Función principal que analiza la página actual
async function analizarPagina() {
  // Esperar un momento a que los elementos de YouTube carguen en el DOM
  await new Promise(resolve => setTimeout(resolve, 2000));

  let textoAEvaluar = "";

  // 1. Si estamos en un video, intentamos pillar el título del video
  const tituloVideoElement = document.querySelector("#title h1 yt-formatted-string");
  // 2. Si estamos en un canal, pillamos el nombre del canal
  const nombreCanalElement = document.querySelector("#channel-header #text");

  if (tituloVideoElement) {
    textoAEvaluar = tituloVideoElement.textContent;
  } else if (nombreCanalElement) {
    textoAEvaluar = nombreCanalElement.textContent;
  }

  // Si encontramos algo que evaluar y no está vacío
  if (textoAEvaluar.trim() !== "") {
    console.log(`[Filtro] Evaluando: "${textoAEvaluar}"`);
    
    const esEntretenimiento = await verificarSiEsEntretenimiento(textoAEvaluar);

    if (esEntretenimiento) {
      bloquearPantalla();
    } else {
      console.log("[Filtro] Contenido permitido.");
    }
  }
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
        <span style="font-size: 50px;">🚫</span>
      </div>
    </div>
  `;
}

// Ejecutar la función al cargar la página
analizarPagina();