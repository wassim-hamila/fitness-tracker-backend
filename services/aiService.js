const fs = require("fs");
const path = require("path");

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];

function getGeminiModels() {
  const fromEnv = (process.env.GEMINI_MODEL || process.env.GEMINI_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : DEFAULT_GEMINI_MODELS;
}

function formatGeminiError(err) {
  const msg = err?.message || "Erreur Gemini inconnue";

  if (msg.includes("404") || msg.includes("not found")) {
    return new Error(
      "Modèle Gemini introuvable. Mets GEMINI_MODEL=gemini-2.5-flash-lite dans le .env backend."
    );
  }
  if (msg.includes("429") || msg.includes("quota")) {
    return new Error(
      "Quota Gemini dépassé. Réessaie dans quelques minutes ou vérifie ta clé API sur Google AI Studio."
    );
  }
  if (msg.includes("503") || msg.includes("high demand")) {
    return new Error(
      "Gemini est temporairement surchargé. Réessaie dans un instant."
    );
  }
  if (msg.includes("API key not valid") || msg.includes("401")) {
    return new Error(
      "Clé GEMINI_API_KEY invalide. Vérifie ta clé sur https://aistudio.google.com/apikey"
    );
  }

  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithGeminiModel(genAI, modelName, prompt, maxOutputTokens = 800) {
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens,
    },
  });

  const text =
    result?.response?.text?.() ||
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Gemini a renvoyé une réponse vide");
  return text.trim();
}

// --- Provider: Gemini ---
async function callGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante dans .env");

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = getGeminiModels();
  const maxOutputTokens = options.maxOutputTokens || 800;

  let lastError = null;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await generateWithGeminiModel(
          genAI,
          modelName,
          prompt,
          maxOutputTokens
        );

        if (modelName !== models[0]) {
          console.log(`[AI] Gemini fallback utilisé: ${modelName}`);
        }

        return text;
      } catch (err) {
        lastError = err;
        const msg = err?.message || "";
        const retryable = msg.includes("503") || msg.includes("429");

        console.error(
          `[AI] Gemini ${modelName} (tentative ${attempt + 1}) échoué:`,
          msg.split("\n")[0]
        );

        if (retryable && attempt === 0) {
          await sleep(1500);
          continue;
        }

        break;
      }
    }
  }

  throw formatGeminiError(lastError || new Error("Aucun modèle Gemini disponible"));
}

// --- Provider: Ollama (local) ---
async function callOllama(prompt) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      prompt,
      stream: false,
      options: { temperature: 0.75, top_p: 0.9, repeat_penalty: 1.15, num_predict: 280 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama indisponible (status ${response.status}). Lance ollama ou change AI_PROVIDER=gemini`);
  }

  const data = await response.json();
  if (!data.response) throw new Error("Ollama a renvoyé une réponse vide");
  return data.response.trim();
}

// --- Main chat reply ---
async function generateReply({
  message,
  history = [],
  userProfile = {},
  files = [],
}) {
  const formattedHistory = history
    .slice(-6)
    .map((m) => {
      const role = m.role === "assistant" ? "Assistant" : "Utilisateur";
      const content = m.content || m.message || "";
      return `${role}: ${content}`;
    })
    .join("\n");

  const filesContext =
    files.length > 0
      ? files
          .map(
            (f) =>
              `- ${f.originalname || f.name || 'fichier'} | type: ${f.mimetype || f.type || '?'}`
          )
          .join("\n")
      : "Aucun fichier joint";

  const prompt = `
Tu es CoachIA, un assistant conversationnel dans FitTrack (application fitness française).

Comportement :
- Réponds comme un vrai coach amical, naturel et court.
- Si le message est court ("salut", "cv"), réponds en 1 phrase sympa.
- Réponds en français naturel.
- Parle de fitness, nutrition, programmes, motivation, mais aussi tout ce que l'utilisateur veut.
- Si l'utilisateur demande une image, dis-lui d'utiliser la fonctionnalité Image.

Fichiers joints :
${filesContext}

Profil :
${JSON.stringify(userProfile, null, 2)}

Historique :
${formattedHistory}

Message :
${message}

Réponds de façon utile et concise :
`.trim();

  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  try {
    if (provider === "gemini") {
      return await callGemini(prompt);
    }
    if (provider === "ollama") {
      return await callOllama(prompt);
    }
    // default to gemini if key present, else ollama
    if (process.env.GEMINI_API_KEY) {
      return await callGemini(prompt);
    }
    return await callOllama(prompt);
  } catch (err) {
    console.error(`[AI] ${provider} failed:`, err.message);
    // graceful fallback
    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      // try ollama as fallback
      try { return await callOllama(prompt); } catch {}
    }
    throw err;
  }
}

async function improveImagePrompt(userPrompt) {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  const imagePromptInstruction = `
Tu es un expert en prompt engineering pour générer des images fitness / lifestyle.

Transforme la demande en un prompt anglais détaillé, prêt pour un générateur d'images.
- Réponds UNIQUEMENT par le prompt final (pas d'explication).
- Ajoute "realistic photo, natural lighting, detailed, high quality" si réaliste demandé.
- Ajoute style si cartoon etc.

Demande: ${userPrompt}

Prompt final:
`.trim();

  try {
    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const text = await callGemini(imagePromptInstruction, { maxOutputTokens: 200 });
      return (text || userPrompt).trim();
    }

    // fallback ollama for image prompt
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: imagePromptInstruction,
        stream: false,
        options: { temperature: 0.6, num_predict: 160 },
      }),
    });
    if (!response.ok) return userPrompt;
    const data = await response.json();
    return data.response?.trim() || userPrompt;
  } catch {
    return userPrompt;
  }
}

async function generateImagePrompt(prompt) {
  const apiKey = process.env.POLLINATIONS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Clé Pollinations manquante. Ajoute POLLINATIONS_API_KEY dans le .env backend."
    );
  }

  const improvedPrompt = await improveImagePrompt(prompt);

  console.log("Prompt utilisateur:", prompt);
  console.log("Prompt image amélioré:", improvedPrompt);

  const encodedPrompt = encodeURIComponent(improvedPrompt);
  const seed = Math.floor(Math.random() * 999999);

  const imageApiUrl =
    `https://gen.pollinations.ai/image/${encodedPrompt}` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&width=1024` +
    `&height=1024` +
    `&seed=${seed}`;

  const response = await fetch(imageApiUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "image/png,image/jpeg,image/webp,*/*",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Erreur Pollinations complète:", errorText);

    throw new Error(
      `Erreur génération image: ${response.status} ${errorText.slice(0, 500)}`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("image")) {
    const text = await response.text();
    throw new Error(`Réponse image invalide: ${text.slice(0, 300)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadsDir = path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `generated-${Date.now()}.png`;
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFileSync(filePath, buffer);

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`;
  return `${backendUrl}/uploads/${fileName}`;
}

module.exports = {
  generateReply,
  generateAIReply: generateReply,
  generateImagePrompt,
};