const {
  generateReply,
  generateImagePrompt,
} = require("../services/aiService");

function safeParseJSON(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

const sendMessage = async (req, res) => {
  try {
    const { message = "" } = req.body;
    const history = safeParseJSON(req.body.history, []);
    const userProfile = safeParseJSON(req.body.userProfile, {});
    const files = req.files || [];

    if (!message.trim() && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Le message ou un fichier est requis",
      });
    }

    const reply = await generateReply({
      message,
      history,
      userProfile,
      files,
    });

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Erreur coachController:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Erreur IA",
    });
  }
};

const generateImage = async (req, res) => {
  try {
    const { prompt = "" } = req.body;
    const files = req.files || [];

    if (!prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le prompt image est requis",
      });
    }

    const imageUrl = await generateImagePrompt(prompt);

    return res.status(200).json({
      success: true,
      reply: "Voici l’image générée.",
      imageUrl,
    });
  } catch (error) {
    console.error("Erreur generateImage:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Erreur génération image",
    });
  }
};

module.exports = {
  sendMessage,
  generateImage,
};