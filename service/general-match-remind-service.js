const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const mongoose = require("mongoose");

//提醒用戶查看今天的配對(每天 08:00 發送)
const runGeneralMatchRemind = async () => {
  try {
    //連結 mongoDB
    mongoose
      .connect(process.env.MONGODB_CONNECTION)
      .then(() => {
        console.log("連結到 mongoDB");
      })
      .catch((e) => {
        console.log(e);
      });

    //獲取今天所有配對
    const newestMatches = await MatchNewest.find({
      matchUIType: 1,
    })
      .populate("user1_ID", ["userID", "deviceTokens", "userValidCode"])
      .populate("user2_ID", ["userID", "deviceTokens", "userValidCode"]);

    const targetUsers = new Set();

    newestMatches.map((match) => {
      if (
        match.user1_ID &&
        match.user1_ID.userValidCode == "1" &&
        match.user1_ID.notificationStatus &&
        match.user1_ID.deviceTokens
      ) {
        match.user1_ID.deviceTokens.forEach((token) => {
          if (token) {
            targetUsers.add(token);
          }
        });
      }

      if (
        match.user2_ID &&
        match.user2_ID.userValidCode == "1" &&
        match.user2_ID.notificationStatus &&
        match.user2_ID.deviceTokens
      ) {
        match.user2_ID.deviceTokens.forEach((token) => {
          if (token) {
            targetUsers.add(token);
          }
        });
      }
    });

    //將 Set 轉換回陣列
    const finalTargetUsers = Array.from(targetUsers);

    await cloudMsgService.sendMsgToDevice(finalTargetUsers, {
      title: "💌 新的緣分來了！",
      body: "🕊️ 新的配對已經送到，快開始你的緣分之旅吧！",
      image: "",
      behaviorType: "100",
      navigateSign: "home",
    });
  } catch (e) {
    console.log("提醒用戶查看今天的配對", e);
  }
};

runGeneralMatchRemind();
