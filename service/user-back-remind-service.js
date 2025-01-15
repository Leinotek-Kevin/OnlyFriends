const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const User = require("../models").user;
const dateUtil = require("../utils/date-util");
const mongoose = require("mongoose");

//提醒還沒上線的用戶上線(每天 19:00 發送)
const runUserBackRemind = async () => {
  try {
    //今天午夜的時間戳記
    const todayNight = dateUtil.getTodayNight();

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

    //今天有配對到的用戶
    const todayMatchUsers = new Set();

    //提醒有配對但今天都沒有上線的用戶上線
    const targetMatchUsers = new Set();

    newestMatches.map((match) => {
      todayMatchUsers.add(match.user1ID);
      todayMatchUsers.add(match.user2ID);

      if (
        match.user1_ID &&
        match.user1_ID.deviceToken &&
        match.user1_ID.userValidCode == "1" &&
        match.user1_ID.lastLoginTime < todayNight
      ) {
        targetMatchUsers.add(match.user1_ID.deviceToken);
      }

      if (
        match.user2_ID &&
        match.user2_ID.deviceToken &&
        match.user2_ID.userValidCode == "1" &&
        match.user2_ID.lastLoginTime < todayNight
      ) {
        targetMatchUsers.add(match.user2_ID.deviceToken);
      }
    });

    const finalTargetMatchUsers = Array.from(targetMatchUsers);

    await cloudMsgService.sendMsgToDevice(finalTargetMatchUsers, {
      title: "🔥 新朋友等你互動！",
      body: "今天你有新配對，快來聊聊吧！",
      image: "",
      behaviorType: "102",
      navigateSign: "home",
    });

    //-----------------------------------------------------------------------------//
    //提醒沒有配對到且今天都還沒有上線的用戶
    const targetNonMatchUsers = await User.find({
      //排隊今天配對到的用戶,剩下就是沒有配對到的
      userID: { $nin: finalTargetMatchUsers },
      deviceToken: { $ne: "", $ne: null },
      lastLoginTime: { $lt: todayNight }, // lastLoginTime 小於 todayNight
      userValidCode: "1",
    });

    const targetNonMatchDevices = [];

    targetNonMatchUsers.forEach((user) => {
      if (user && user.deviceToken) {
        targetNonMatchDevices.push(user.deviceToken);
      }
    });
    console.log(targetNonMatchDevices);

    await cloudMsgService.sendMsgToDevice(targetNonMatchDevices, {
      title: "⏰ 不要錯過明天的緣分！",
      body: "錯過今天，明天就沒配對機會了！快回來和新朋友相遇吧！",
      image: "",
      behaviorType: "103",
      navigateSign: "home",
    });
  } catch (e) {
    console.log("提醒有配對到的用戶趕快上線", e);
  }
};

runUserBackRemind();
