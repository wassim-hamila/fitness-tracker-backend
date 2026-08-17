const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// @desc    Liste des conversations (dernier message + non-lus par interlocuteur)
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { recipient: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', userId] }, '$recipient', '$sender'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$recipient', userId] }, { $eq: ['$read', false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    const populated = await User.populate(conversations, {
      path: '_id',
      select: 'name profilePicture',
    });

    res.json(populated.map((c) => ({
      user: c._id,
      lastMessage: c.lastMessage.text,
      lastMessageAttachmentType: c.lastMessage.attachmentType || null,
      lastMessageHasProgram: !!c.lastMessage.sharedProgram,
      lastMessageDate: c.lastMessage.createdAt,
      lastMessageFromMe: c.lastMessage.sender.toString() === req.user.id,
      unreadCount: c.unreadCount,
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Nombre total de messages non lus (pour un badge)
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Historique des messages avec un utilisateur
// @route   GET /api/messages/:userId
// @access  Private
exports.getThread = async (req, res) => {
  try {
    const otherId = req.params.userId;

    const otherUser = await User.findById(otherId).select('name profilePicture');
    if (!otherUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: otherId },
        { sender: otherId, recipient: req.user.id },
      ],
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: otherId, recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ user: otherUser, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Envoyer un message
// @route   POST /api/messages/:userId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text, attachmentType, attachmentUrl, sharedProgram } = req.body;
    const recipientId = req.params.userId;
    const trimmedText = (text || '').trim();

    if (!trimmedText && !attachmentUrl && !sharedProgram) {
      return res.status(400).json({ message: 'Message vide' });
    }
    if (attachmentType && !['image', 'video'].includes(attachmentType)) {
      return res.status(400).json({ message: 'Type de pièce jointe invalide' });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ message: 'Impossible de t\'envoyer un message à toi-même' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const message = await Message.create({
      sender: req.user.id,
      recipient: recipientId,
      text: trimmedText,
      attachmentType: attachmentUrl ? attachmentType : null,
      attachmentUrl: attachmentUrl || null,
      sharedProgram: sharedProgram || null,
    });

    let notifMessage = `${req.user.name || 'Quelqu\'un'} t'a envoyé un message.`;
    if (attachmentType === 'image') notifMessage = `${req.user.name || 'Quelqu\'un'} t'a envoyé une photo.`;
    if (attachmentType === 'video') notifMessage = `${req.user.name || 'Quelqu\'un'} t'a envoyé une vidéo.`;
    if (sharedProgram) notifMessage = `${req.user.name || 'Quelqu\'un'} t'a partagé un programme.`;

    await createNotification({
      userId: recipientId,
      title: 'Nouveau message',
      message: notifMessage,
      type: 'info',
      relatedId: req.user.id,
      relatedType: 'user',
      link: '/messages',
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
