
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

dotenv.config();


const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
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


module.exports = s3;




