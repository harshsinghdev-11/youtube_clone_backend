const jwt = require("jsonwebtoken");
const User = require("../models/User")
const dotenv = require("dotenv");
dotenv.config();
const protect  = async(req,res,next)=>{
    try {
        const token = req.cookies.accessToken;
        if(!token){
            return res.status(401).json({
                success:false,
                msg:"Not authorized, no token"
            });
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        next();
    } catch (error) {
       console.error("Auth error:", error);
    res.status(401).json({ success: false, msg: "Not authorized" }); 
    }
}

module.exports = {protect}