const cloudMsgService = require("../utils/cloudmsg-util");
const ActivityCircle = require("../models").activityCircle;
const User = require("../models").user;
const mongoose = require("mongoose");

//提醒用戶主題小圈圈已開放(星期五凌晨00:00)
const startSchedule = async () => {
  const day = new Date(Date.now()).getDay();
  const now = new Date();

  if (day == 5 && now.getHours() == 0 && now.getMinutes() == 0) {
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

      const activityCircle = await ActivityCircle.find(
        {},
        {
          _id: 0,
          circleTopicID: 1,
          circleTopicName: 1,
          circleUserIDS: 1,
        }
      );

      // 統一收集所有 userID
      const allUserIDs = activityCircle.flatMap(
        (circle) => circle.circleUserIDS
      );

      // 一次性查出所有需要的 user 資料
      const allUsers = await User.find(
        { userID: { $in: allUserIDs } },
        { deviceTokens: 1, osType: 1, userID: 1, _id: 0 }
      );

      // 建立 userID -> user 資料 Map，加快查找速度
      const userMap = new Map();
      allUsers.forEach((user) => {
        userMap.set(user.userID, user);
      });

      const androidPushTargets = [];
      const iOSPushTargets = [];

      for (const circle of activityCircle) {
        const topicName = circle.circleTopicName;

        circle.circleUserIDS.forEach((userID) => {
          const user = userMap.get(userID);
          if (!user || !user.deviceTokens?.length) return;

          const info = {
            pushMessage: `歡迎加入 : ${topicName} 主題圈圈!`,
            tokens: user.deviceTokens,
          };

          if (user.osType === "0") {
            androidPushTargets.push(info);
          } else {
            iOSPushTargets.push(info);
          }
        });
      }

      // 推播：每一則訊息是獨立的 object，避免覆寫問題
      const sendAndroidPushes = androidPushTargets.map(
        ({ tokens, pushMessage }) =>
          cloudMsgService.sendMsgToAndroidDevice(tokens, {
            title: "主題圈圈活動開始嚕！",
            body: pushMessage,
            image: "",
            behaviorType: "106",
            navigateSign: "home",
          })
      );

      const sendIOSPushes = iOSPushTargets.map(({ tokens, pushMessage }) =>
        cloudMsgService.sendMsgToIOSDevice(tokens, {
          title: "主題圈圈活動開始嚕！",
          body: pushMessage,
          image: "",
          behaviorType: "106",
          navigateSign: "home",
        })
      );

      // 同步等待全部推播完成
      await Promise.all([...sendAndroidPushes, ...sendIOSPushes]);
    } catch (e) {
      console.log("發送圈圈提醒推播異常", e);
    }
  }
};

module.exports = startSchedule;
