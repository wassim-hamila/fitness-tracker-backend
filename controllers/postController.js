const Post = require('../models/Post');
const { createNotification } = require('./notificationController');

const formatPost = (post, userId) => {
  const obj = post.toObject ? post.toObject() : post;
  const likes = obj.likes || [];
  const comments = obj.comments || [];

  return {
    ...obj,
    caption: obj.content,
    image: obj.imageUrl,
    type: obj.postType || 'regular',
    likesCount: likes.length,
    isLiked: likes.some((id) => (id?._id || id)?.toString() === userId?.toString()),
    commentsCount: comments.length,
  };
};

exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const followingIds = (req.user.following || []).map((id) => id.toString());

    // Le feed montre : les posts publics de tout le monde, tes propres posts (public ou privé),
    // et les posts privés des gens que tu suis (comme un compte prive sur Instagram).
    const posts = await Post.find({
      $or: [
        { visibility: { $ne: 'private' } },
        { user: req.user.id },
        { user: { $in: followingIds } },
      ],
    })
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json(posts.map((p) => formatPost(p, req.user.id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const isOwnProfile = req.params.userId === req.user.id;
    const followingIds = (req.user.following || []).map((id) => id.toString());
    const canSeePrivate = isOwnProfile || followingIds.includes(req.params.userId);

    const filter = canSeePrivate
      ? { user: req.params.userId }
      : { user: req.params.userId, visibility: { $ne: 'private' } };

    const posts = await Post.find(filter)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json(posts.map((p) => formatPost(p, req.user.id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    const content = (req.body.content || req.body.caption || '').trim();
    const imageUrl = req.body.imageUrl || req.body.image || undefined;
    const postType = req.body.type || req.body.postType || 'regular';
    const location = req.body.location || undefined;
    const visibility = req.body.visibility === 'private' ? 'private' : 'public';

    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Le contenu ou une image est requis' });
    }

    const post = await Post.create({
      user: req.user.id,
      content: content || (imageUrl ? '📷 Photo partagée' : ''),
      imageUrl,
      postType,
      location,
      visibility,
    });

    const populated = await Post.findById(post._id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    // Notification de confirmation — le post reste en base jusqu'à suppression
    await createNotification({
      userId: req.user.id,
      title: 'Publication en ligne',
      message: postType === 'question'
        ? 'Ta question est publiée et restera visible jusqu\'à ce que tu la supprimes.'
        : 'Ton post est publié et restera visible jusqu\'à ce que tu le supprimes.',
      type: 'success',
      relatedId: post._id,
      relatedType: 'program',
    });

    res.status(201).json(formatPost(populated, req.user.id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    const userId = req.user.id;
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
      if (post.user.toString() !== userId) {
        const liker = req.user.name || 'Quelqu\'un';
        await createNotification({
          userId: post.user,
          title: 'Nouveau like ❤️',
          message: `${liker} a aimé ta publication.`,
          type: 'info',
          relatedId: post._id,
          relatedType: 'program',
        });
      }
    }

    await post.save();
    res.json({ liked: !alreadyLiked, likesCount: post.likes.length, isLiked: !alreadyLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Commentaire requis' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    post.comments.push({
      user: req.user.id,
      text: text.trim(),
    });

    await post.save();

    if (post.user.toString() !== req.user.id) {
      await createNotification({
        userId: post.user,
        title: 'Nouveau commentaire 💬',
        message: `${req.user.name || 'Quelqu\'un'} a commenté ta publication.`,
        type: 'info',
        relatedId: post._id,
        relatedType: 'program',
      });
    }

    const updated = await Post.findById(post._id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.status(201).json(formatPost(updated, req.user.id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    await post.deleteOne();
    res.json({ message: 'Post supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};