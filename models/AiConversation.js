const mongoose = require("mongoose");

const aiMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const aiConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    title: {
      type: String,
      default: "Nouvelle conversation",
    },

    messages: [aiMessageSchema],

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AiConversation", aiConversationSchema);