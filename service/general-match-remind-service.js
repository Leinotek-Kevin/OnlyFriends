const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const mongoose = require("mongoose");

//提醒用戶查看今天的配對(每天 08:00 發送)
const runGeneralMatchRemind = async () => {
  try {
    //獲取今天所有配對
    const newestMatches = await MatchNewest.find({
      matchUIType: 1,
    })
      .populate("user1_ID", ["userID", "deviceToken", "userValidCode"])
      .populate("user2_ID", ["userID", "deviceToken", "userValidCode"]);

    const targetUsers = new Set();

    newestMatches.map((match) => {
      if (
        match.user1_ID &&
        match.user1_ID.deviceToken &&
        match.user1_ID.userValidCode == "1"
      ) {
        targetUsers.add(match.user1_ID.deviceToken);
      }

      if (
        match.user2_ID &&
        match.user2_ID.deviceToken &&
        match.user2_ID.userValidCode == "1"
      ) {
        targetUsers.add(match.user2_ID.deviceToken);
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
