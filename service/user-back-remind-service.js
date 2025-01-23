const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const User = require("../models").user;
const dateUtil = require("../utils/date-util");
const mongoose = require("mongoose");

//提醒還沒上線的用戶上線(每天 19:00 發送)
const runUserBackRemind = async () => {
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

    //今天午夜的時間戳記
    const todayNight = dateUtil.getTodayNight();

    //獲取今天所有配對
    const newestMatches = await MatchNewest.find({
      matchUIType: 1,
    })
      .populate("user1_ID", [
        "userID",
        "deviceTokens",
        "userValidCode",
        "lastLoginTime",
        "notificationStatus",
        "osType",
      ])
      .populate("user2_ID", [
        "userID",
        "deviceTokens",
        "userValidCode",
        "lastLoginTime",
        "notificationStatus",
        "osType",
      ]);

    //今天有配對到的用戶
    const todayMatchUsers = new Set();

    //提醒有配對但今天都沒有上線的用戶上線
    const targetIOSMatchDevices = new Set();
    const targetAndroidMatchDevices = new Set();

    newestMatches.map((match) => {
      todayMatchUsers.add(match.user1ID);
      todayMatchUsers.add(match.user2ID);
      if (
        match.user1_ID &&
        match.user1_ID.userValidCode == "1" &&
        match.user1_ID.notificationStatus &&
        match.user1_ID.deviceTokens &&
        match.user1_ID.lastLoginTime < todayNight
      ) {
        match.user1_ID.deviceTokens.forEach((token) => {
          let isAndroidUser = match.user1_ID.osType == "0";

          if (token) {
            if (isAndroidUser) {
              targetAndroidMatchDevices.add(token);
            } else {
              targetIOSMatchDevices.add(token);
            }
          }
        });
      }

      if (
        match.user2_ID &&
        match.user2_ID.userValidCode == "1" &&
        match.user2_ID.notificationStatus &&
        match.user2_ID.deviceTokens &&
        match.user2_ID.lastLoginTime < todayNight
      ) {
        match.user2_ID.deviceTokens.forEach((token) => {
          let isAndroidUser = match.user2_ID.osType == "0";

          if (token) {
            if (isAndroidUser) {
              targetAndroidMatchDevices.add(token);
            } else {
              targetIOSMatchDevices.add(token);
            }
          }
        });
      }
    });

    const finalTargetMatchAndroidUsers = Array.from(targetAndroidMatchDevices);
    const finalTargetMatchIOSUsers = Array.from(targetIOSMatchDevices);

    const remindMatchData = {
      title: "🔥 新朋友等你互動！",
      body: "今天你有新配對，快來聊聊吧！",
      image: "",
      behaviorType: "102",
      navigateSign: "home",
    };

    await cloudMsgService.sendMsgToAndroidDevice(
      finalTargetMatchAndroidUsers,
      remindMatchData
    );

    await cloudMsgService.sendMsgToIOSDevice(
      finalTargetMatchIOSUsers,
      remindMatchData
    );

    //-----------------------------------------------------------------------------//
    //提醒沒有配對到且今天都還沒有上線的用戶

    const finalTodaytMatchUsers = Array.from(todayMatchUsers);

    //沒有配對到的所有用戶
    const targetNonMatchUsers = await User.find({
      //排隊今天配對到的用戶,剩下就是沒有配對到的
      userID: { $nin: finalTodaytMatchUsers },
      deviceToken: { $ne: "", $ne: null },
      lastLoginTime: { $lt: todayNight }, // lastLoginTime 小於 todayNight
      userValidCode: "1",
    });

    const targetNonIOSDevices = new Set();
    const targetNonAndroidDevices = new Set();

    targetNonMatchUsers.forEach((user) => {
      if (user && user.deviceTokens) {
        let isAndroidUser = user.osType;

        user.deviceTokens.forEach((token) => {
          if (token) {
            if (isAndroidUser) {
              targetNonAndroidDevices.add(token);
            } else {
              targetNonIOSDevices.add(token);
            }
          }
        });
      }
    });

    const remindNonData = {
      title: "⏰ 不要錯過明天的緣分！",
      body: "錯過今天，明天就沒配對機會了！快回來和新朋友相遇吧！",
      image: "",
      behaviorType: "103",
      navigateSign: "home",
    };

    const finalTargetNonAndroidUsers = Array.from(targetNonAndroidDevices);
    const finalTargetNonIOSUsers = Array.from(targetNonIOSDevices);

    await cloudMsgService.sendMsgToAndroidDevice(
      finalTargetNonAndroidUsers,
      remindNonData
    );

    await cloudMsgService.sendMsgToIOSDevice(
      finalTargetNonIOSUsers,
      remindNonData
    );
  } catch (e) {
    console.log("提醒還沒上線的用戶上線", e);
  }
};

runUserBackRemind();
