const express = require("express");
const router =express.Router();
const Video = require("../models/Video");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");


router.post("/:channelId",protect,async(req,res)=>{
  const {channelId} = req.params;
  const userId = req.user._id;

  if(channelId===String(userId)){
    return res.status(400).json({
      msg:"Do you Like your Own post Maaaaaaan!!!!!!"
    })
  }

  try {
    const user = await User.findById(userId);
    const channel = await User.findById(channelId);
    if(!channel) return res.status(404).json({msg:"Not Found"})

    if(user.subscribedChannels.includes(channelId)){
      user.subscribedChannels.pull(channelId);
      channel.subscribers = Math.max(0,channel.subscribers-1);
      await user.save();
      await channel.save();
      return res.json({msg:"Unsubscribed"});
    }

    user.subscribedChannels.push(channelId);
    channel.subscribers +=1;
    await user.save();
    await channel.save();
    res.json({
      msg:"Subscribed"
    })
  } catch (error) {
    console.log("Error in subscribe api: ",error);
    res.status(500).json({
      msg:"Server error"
    })
  }
})


router.get("/status/:channelId",protect,async(req,res)=>{
  try {
    const user = await User.findById(req.user._id);
    const isSubscribed = user.subscribedChannels.includes(req.params.channelId);
    res.json({
      subscribed:isSubscribed
    })
  } catch (error) {
    console.log("error: ",error);
    res.status(500).json({
      msg:"Server error"
    })
  }
})

router.get("/count/:channelId", async (req, res) => {
  try {
    const channel = await User.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ msg: "Channel not found" });
    res.json({ subscribers: channel.subscribers });
  } catch (error) {
    console.log("Error fetching subscriber count:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;