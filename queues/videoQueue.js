const {Queue} = require("bullmq");
const {v4} = require("uuid");
const logger = require("../utils/logger")
const dotenv = require("dotenv");
dotenv.config();

// const connection = {
//   url: process.env.REDIS_URL,
// };

const connection = {
  host:process.env.REDIS_HOST,
  port:Number(process.env.REDIS_PORT),
  password:process.env.REDIS_PASSWORD
}
console.log(typeof process.env.REDIS_PORT);



const videoQueue= new Queue("video-processing",{connection});


async function addVideoJob(data){
    const jobId = v4();
    await videoQueue.add("convertToHLS",data,{jobId});
    console.log("Added job:",jobId);
    return jobId;
}

module.exports = {videoQueue,addVideoJob};