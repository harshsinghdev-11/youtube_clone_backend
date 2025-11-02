const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();

//DB
const connectDB = require("./config/db")
connectDB();

//routes
const authRoutes = require("./routes/auth")
const videoRoutes = require("./routes/video");
const commentRoutes = require("./routes/comment")
const subscribeRoutes = require("./routes/subscribe")



// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Move this BEFORE routes
app.use("/uploads", express.static("uploads"));
app.use("/api/auth",authRoutes);
app.use("/api/video",videoRoutes);
app.use("/api/comment",commentRoutes);
app.use("/api/subscribe",subscribeRoutes);


app.listen(8000, () => {
  console.log("Server is running on http://localhost:8000");
});
