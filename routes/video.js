  const express = require("express");
  const multer = require("multer");
  const { v4 } = require("uuid");
  const path = require("path");
  const fs = require("fs");
  const { exec } = require("child_process");
  const Video = require("../models/Video");
  const { protect } = require("../middleware/authMiddleware");
  const dotenv = require("dotenv");
  const router = express.Router();
  dotenv.config();
  const AWS = require("aws-sdk")
  const logger = require("../utils/logger")

  // Ensure uploads folder exists
  if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads", { recursive: true });
  }

  // Multer storage config
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "./uploads"),
    filename: (req, file, cb) =>
      cb(null, `${file.fieldname}-${v4()}${path.extname(file.originalname)}`)
  });

  const upload = multer({ storage });

  //queue
  const {addVideoJob, videoQueue} = require("../queues/videoQueue");
 

  router.post("/upload", protect, upload.single("video"), async (req, res) => {
    try {
      const { title, description } = req.body;
      const lessonId = v4();
      const videoPath = req.file.path;

      const jobId = await addVideoJob({
        title,
        description,
        uploader:req.user._id,
        videoPath,
        lessonId,
      })

      res.json({
        message:"video uploaded! processing.......",
        jobId:jobId
      })
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: "Server error during upload" });
    }
  });

  router.get("/status/:jobId",async(req,res)=>{
    const job = await videoQueue.getJob(req.params.jobId);
    if(!job){
      return res.status(404).json({status:"not_found"});
    }

    const state = await job.getState();
    res.json({
      state,progress:job.progress || 0
    })
  })

  router.get("/getuservideo/:id",protect,async (req,res)=>{
    try {
      const uploaderId = req.params.id;
    const videos = await Video.find({uploader:uploaderId});
      if(!videos || videos.length===0){
        return res.status(200).json({
          msg:"No videos",
          videos:[]
        })
      }
      res.status(200).json({
        msg:"success",
        videos
      })
    } catch (error) {
      logger.error(error);
      res.status(500).json({
        msg:"server error",
        error:error.message
      })
    }
  })

  router.get("/videos", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const skip = (page-1) * limit;

      const videos = await Video.find()
        .populate("uploader", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
      res.json(videos);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  router.get("/relatedVideo",async(req,res)=>{
     try {
      const page = 1;
      const limit = 6;
      const skip = (page-1) * limit;

      const videos = await Video.find()
        .populate("uploader", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
      res.json(videos);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  })


  router.get("/videos/:id", async (req, res) => {
    try {
      const video = await Video.findById(req.params.id)
        .populate("uploader", "name email");
      if (!video) return res.status(404).json({ error: "Video not found" });

      // Increment views count
      video.views += 1;
      await video.save();
      res.json(video);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: "Failed to get video" });
    }
  });

  router.put("/videos/:id/like", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Toggle like: if liked → unlike, else → like
    const isLiked = video.likes.includes(userId);

    const update = isLiked
      ? { $pull: { likes: userId } }   // unlike
      : { $addToSet: { likes: userId } }; // like (prevents duplicates)

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true } // return updated document
    );

    res.json({
      message: "Like status updated",
      likes: updatedVideo.likes.length,
      likedByUser: updatedVideo.likes.includes(userId),
    });
  } catch (err) {
    logger.error("Error liking video:", err);
    res.status(500).json({ error: "Failed to like video" });
  }
});


const ACCOUNT_ID = process.env.S3_ACCOUNT_ID ;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new AWS.S3({
  endpoint: ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: "auto",
  signatureVersion: "v4",
  s3ForcePathStyle: true,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryable(fn, attempts = 3, baseDelay = 500) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = baseDelay * Math.pow(2, i);
      logger.warn(`Attempt ${i + 1} failed. Retrying after ${delay}ms...`, err.message);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function listAllKeys(bucket, prefix) {
  let continuationToken = undefined;
  const keys = [];

  do {
    const params = { Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken, MaxKeys: 1000 };
    const resp = await retryable(() => s3.listObjectsV2(params).promise(), 3, 300);
    if (resp && resp.Contents) {
      resp.Contents.forEach((item) => keys.push(item.Key));
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function deleteKeysInBatches(bucket, keys) {
  const CHUNK_SIZE = 1000; 
  const results = { deleted: [], errors: [] };

  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const chunk = keys.slice(i, i + CHUNK_SIZE);
    const deleteParams = {
      Bucket: bucket,
      Delete: { Objects: chunk.map((k) => ({ Key: k })), Quiet: false },
    };


    const resp = await retryable(() => s3.deleteObjects(deleteParams).promise(), 3, 500);

    if (resp.Deleted) {
      results.deleted.push(...resp.Deleted.map((d) => d.Key));
    }
    if (resp.Errors && resp.Errors.length) {
      results.errors.push(...resp.Errors.map((e) => ({ Key: e.Key, Code: e.Code, Message: e.Message })));
    }
  }

  return results;
}

router.delete("/:id", protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    if (String(video.uploader) !== String(req.user._id)) {
      return res.status(403).json({ msg: "Not allowed to delete this video" });
    }

    const match = (video.videoUrl || "").match(/videos\/([^/]+)/);
    const lessonId = match ? match[1] : null;

    if (lessonId) {
      const prefix = `videos/${lessonId}/`;
      const keys = await listAllKeys(BUCKET_NAME, prefix);

      if (keys.length > 0) {
        const deleteResult = await deleteKeysInBatches(BUCKET_NAME, keys);

        if (deleteResult.errors.length) {
        
          logger.error("Some keys failed to delete:", deleteResult.errors);
          return res.status(500).json({
            msg: "Failed to delete all video files from storage",
            errors: deleteResult.errors.slice(0, 10), 
          });
        }
      }
    }

    await video.deleteOne();
    return res.json({ msg: "Video deleted successfully" });
  } catch (err) {
    logger.error("Error deleting video:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

  module.exports = router;
