const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const dateUtil = require("../utils/date-util");
const mongoose = require("mongoose");

//提醒有配對到的用戶趕快上線(每天 19:00 發送)
const runOfflineMatchRemind = async () => {
  try {
    //獲取今天所有配對
    const newestMatches = await MatchNewest.find({
      matchUIType: 1,
    })
      .populate("user1_ID", [
        "userID",
        "deviceToken",
        "userValidCode",
        "lastLoginTime",
      ])
      .populate("user2_ID", [
        "userID",
        "deviceToken",
        "userValidCode",
        "lastLoginTime",
      ]);

    const targetUsers = new Set();
    const todayNight = dateUtil.getTodayNight();

    //最近的上線時間小於今天00:00 =>提醒
    newestMatches.map((match) => {
      if (
        match.user1_ID &&
        match.user1_ID.deviceToken &&
        match.user1_ID.userValidCode == "1" &&
        match.user1_ID.lastLoginTime < todayNight
      ) {
        targetUsers.add(match.user1_ID.deviceToken);
      }

      if (
        match.user2_ID &&
        match.user2_ID.deviceToken &&
        match.user2_ID.userValidCode == "1" &&
        match.user2_ID.lastLoginTime < todayNight
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
    console.log("提醒用戶發送紙飛機", e);
  }
};

runOfflineMatchRemind();
