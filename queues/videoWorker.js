const { Worker } = require("bullmq");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const mime = require("mime-types");
const AWS = require("aws-sdk");
const Video = require("../models/Video");
const { stderr } = require("process");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "5bd2b9091c42540c5ce6213c2fb59023";
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

async function uploadToR2(filePath, key, contentType) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(filePath),
    ContentType: contentType,
  };
  try {
    const data = await s3.upload(params).promise();
    console.log("Uploaded:", key);
    return data.Location;
  } catch (err) {
    console.error("Upload failed for", key, err.message);
    throw err;
  }
}

const connection = { host: "127.0.0.1", port: 6379 };

async function generateThumbnail(videoPath,outputPath,timeStamp="00:00:02") {
    return new Promise((resolve,reject)=>{
        const thumbnailPath = path.join(outputPath,"thumbnail.jpg");
        const thumbnailCommand = `ffmpeg -i "${videoPath}" -ss ${timeStamp} -vframes 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -q:v 2 "${thumbnailPath}"`;
    
        exec(thumbnailCommand,(error,stout,stderr)=>{
            if(error){
                console.error("Thumbnail error:",error);
                return reject(error);
            }
            console.log("thumbnail generated:",thumbnailPath);
            resolve(thumbnailPath);
        })
    })
}

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoPath, lessonId, title, description, uploader } = job.data;

    if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);

    const outputPath = `./uploads/videos/${lessonId}`;
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

    await job.updateProgress(10);
    const mainThumbnailPath = await generateThumbnail(videoPath,outputPath,"00:00:02");
    console.log("Thumbnail generated");

    await job.updateProgress(15);


    const hlsPath = path.join(outputPath, "index.m3u8");
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" "${hlsPath}"`;
    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("FFmpeg error:", stderr);
          return reject(error);
        }
        console.log("Video converted to HLS:", hlsPath);
        resolve();
      });
    });

    job.updateProgress(60);


    const files = fs.readdirSync(outputPath);
    await Promise.all(files.map(async(file)=>{
        const filePath = path.join(outputPath,file);
        const contentType = mime.lookup(file) || "application/octet-stream";
        const key=`videos/${lessonId}/${file}`;
        await uploadToR2(filePath,key,contentType);
    }))



    const baseUrl = `${process.env.S3_PUBLIC_URL}/videos/${lessonId}`;
    const videoUrl = `${baseUrl}/index.m3u8`;
    const thumbnailUrl = `${baseUrl}/thumbnail.jpg`;


    await new Video({ title, description, uploader, videoUrl,thumbnailUrl }).save();
    console.log("Saved video metadata:", title);


    console.log("Saved video metadata:", title);
    console.log("Thumbnail URL:", thumbnailUrl);

    try {
      fs.rmSync(outputPath, { recursive: true, force: true });
    } catch {}
    try {
      fs.unlinkSync(videoPath);
    } catch {}
    await job.updateProgress(100);
    console.log("Video processed & uploaded successfully:", videoUrl);
  },
  { connection }
);


worker.on("completed", (job) => console.log(`Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err));
