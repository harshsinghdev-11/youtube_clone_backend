const {Queue} = require("bullmq");
const {v4} = require("uuid");

const connection = {
    host:"127.0.0.1",
    port:6379,
};

const videoQueue= new Queue("video-processing",{connection});


async function addVideoJob(data){
    const jobId = v4();
    await videoQueue.add("convertToHLS",data,{jobId});
    console.log("Added job:",jobId);
    return jobId;
}

module.exports = {videoQueue,addVideoJob};