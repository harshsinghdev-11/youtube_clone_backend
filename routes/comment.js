const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment")
const Video = require("../models/Video");
const {protect} = require("../middleware/authMiddleware")
const logger = require("../utils/logger")

router.post("/addComment",protect,async (req, res) => {
  try {
    const {video, text } = req.body;
    const user = req.user._id;
    if (!user || !video || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const comment = new Comment({ user, video, text });
    await comment.save();

    // populate user for immediate response
    const populated = await comment.populate("user", "name");

    res.status(201).json(populated);
  } catch (error) {
    logger.error("Error creating comment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const comments = await Comment.find({ video: videoId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    logger.error("Error fetching comments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;