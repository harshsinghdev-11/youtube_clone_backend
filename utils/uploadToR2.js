const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = require("../config/s3Client");

const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

dotenv.config();
async function uploadToR2(localPath,key,contentType) {
    const fileStream = fs.statSync(localPath);
    const params = {
        Bucket:process.env.S3_BUCKET_NAME,
        Key:key,
        Body:fs.createReadStream(localPath),
        ContentType:contentType
    }
    const data = await s3.upload(params).promise();
    console.log(data);

    return `${process.env.S3_PUBLIC_URL}/${key}`;
}

module.exports = uploadToR2;