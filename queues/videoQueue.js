const {Queue} = require("bullmq");
const {v4} = require("uuid");
const logger = require("../utils/logger")
const dotenv = require("dotenv");
dotenv.config();

const connection = process.env.UPSTASH_REDIS_REST_URL
  ? { url: process.env.UPSTASH_REDIS_REST_URL }
  : {
      host: process.env.REDIS_HOST || 'redis',
      port: Number(process.env.REDIS_PORT) || 6379,
    };

const videoQueue= new Queue("video-processing",{connection});


async function addVideoJob(data){
    const jobId = v4();
    await videoQueue.add("convertToHLS",data,{jobId});
    logger.log("Added job:",jobId);
    return jobId;
}

module.exports = {videoQueue,addVideoJob};