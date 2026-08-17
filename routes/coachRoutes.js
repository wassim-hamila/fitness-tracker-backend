const express = require("express");
const multer = require("multer");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  sendMessage,
  generateImage,
} = require("../controllers/coachController");

// Stockage en mémoire (jamais écrit sur disque / jamais exposé publiquement) —
// seuls le nom et le type des fichiers joints sont utilisés par le coach IA.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont acceptés'));
    }
  },
});

// Support JSON + multipart (fichiers optionnels)
const optionalUpload = upload.array("files", 5);

const handleCoachMessage = (req, res, next) => {
  // Si Content-Type n'est pas multipart, multer peut parfois gêner — on wrap
  optionalUpload(req, res, (err) => {
    if (err) {
      // Ignore les erreurs multer pour les body JSON purs
      if (err instanceof multer.MulterError || String(err.message || '').includes('multipart')) {
        return sendMessage(req, res, next);
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    return sendMessage(req, res, next);
  });
};

router.post("/message", protect, handleCoachMessage);
router.post("/chat", protect, handleCoachMessage); // alias frontend
router.post("/image", protect, upload.array("files", 5), generateImage);

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Coach routes OK" });
});

module.exports = router;