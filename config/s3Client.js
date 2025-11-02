// const {S3Client} = require("@aws-sdk/client-s3")
// const accountid = process.env.S3_ACCOUNT_ID
// const s3 = new S3Client({
//     region:"auto",
//     endpoint: `https://${accountid}.r2.cloudflarestorage.com`,
//     credentials:{
//         accessKeyId: process.env.S3_ACCESS_KEY,
//         secretAccessKey: process.env.S3_SECRET_KEY,
//     }
// })

// module.exports = s3;



const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

dotenv.config();


const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "5bd2b9091c42540c5ce6213c2fb59023";
const BUCKET_NAME = process.env.R2_BUCKET_NAME;


const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new AWS.S3({
  endpoint:"https://5bd2b9091c42540c5ce6213c2fb59023.r2.cloudflarestorage.com",
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: "auto",
  signatureVersion: "v4",
  s3ForcePathStyle: true, 
});

// async function uploadToR2(filePath,fileName) {
//     const fileStats = fs.statSync(filePath);
//     const params = {
//         Bucket:"yt-clone",
//         Key:fileName,
//         Body:fs.createReadStream(filePath),
//     };
//     const data = await s3.upload(params).promise();
//     console.log(data);
// }
module.exports = s3;

// uploadToR2("index.js","index.js");


