const cloudMsgService = require("../utils/cloudmsg-util");
const MatchNewest = require("../models").matchNewest;
const mongoose = require("mongoose");

//提醒用戶查看今天的配對(每天 08:00 發送)
const generalMatchRemind = async () => {
  //台灣時間
  const now = new Date();

  if (now.getHours() == 8 && now.getMinutes() == 0) {
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
        .populate("user1_ID", [
          "userID",
          "deviceTokens",
          "userValidCode",
          "notificationStatus",
          "osType",
        ])
        .populate("user2_ID", [
          "userID",
          "deviceTokens",
          "userValidCode",
          "notificationStatus",
          "osType",
        ]);

      //目標雙平台用戶
      const targetAndroidDevices = new Set();
      const targetIOSDevices = new Set();

      newestMatches.forEach((match) => {
        if (
          match.user1_ID &&
          match.user1_ID.userValidCode == "1" &&
          match.user1_ID.notificationStatus &&
          match.user1_ID.deviceTokens
        ) {
          match.user1_ID.deviceTokens.forEach((token) => {
            let isAndroidUser = match.user1_ID.osType === "0";

            if (token) {
              if (isAndroidUser) {
                targetAndroidDevices.add(token);
              } else {
                targetIOSDevices.add(token);
              }
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
            let isAndroidUser = match.user2_ID.osType == "0";

            if (token) {
              if (isAndroidUser) {
                targetAndroidDevices.add(token);
              } else {
                targetIOSDevices.add(token);
              }
            }
          });
        }
      });

      //將 Set 轉換回陣列
      const finalTargetAndroidUsers = Array.from(targetAndroidDevices);
      const finalTargetIOSUsers = Array.from(targetIOSDevices);

      const remindData = {
        title: "💌 新的緣分來了！",
        body: "🕊️ 新的配對已經送到，快開始你的緣分之旅吧！",
        image: "",
        behaviorType: "100",
        navigateSign: "home",
      };

      await cloudMsgService.sendMsgToAndroidDevice(
        finalTargetAndroidUsers,
        remindData
      );

      await cloudMsgService.sendMsgToIOSDevice(finalTargetIOSUsers, remindData);
    } catch (e) {
      console.log("提醒用戶查看今天的配對", e);
    }
  }
};

module.exports = generalMatchRemind;

// //提醒用戶查看今天的配對(每天 08:00 發送)
// const runGeneralMatchRemind = async () => {
//   try {
//     //連結 mongoDB
//     mongoose
//       .connect(process.env.MONGODB_CONNECTION)
//       .then(() => {
//         console.log("連結到 mongoDB");
//       })
//       .catch((e) => {
//         console.log(e);
//       });

//     //獲取今天所有配對
//     const newestMatches = await MatchNewest.find({
//       matchUIType: 1,
//     })
//       .populate("user1_ID", [
//         "userID",
//         "deviceTokens",
//         "userValidCode",
//         "notificationStatus",
//         "osType",
//       ])
//       .populate("user2_ID", [
//         "userID",
//         "deviceTokens",
//         "userValidCode",
//         "notificationStatus",
//         "osType",
//       ]);

//     //目標雙平台用戶
//     const targetAndroidDevices = new Set();
//     const targetIOSDevices = new Set();

//     newestMatches.forEach((match) => {
//       if (
//         match.user1_ID &&
//         match.user1_ID.userValidCode == "1" &&
//         match.user1_ID.notificationStatus &&
//         match.user1_ID.deviceTokens
//       ) {
//         match.user1_ID.deviceTokens.forEach((token) => {
//           let isAndroidUser = match.user1_ID.osType === "0";

//           if (token) {
//             if (isAndroidUser) {
//               targetAndroidDevices.add(token);
//             } else {
//               targetIOSDevices.add(token);
//             }
//           }
//         });
//       }

//       if (
//         match.user2_ID &&
//         match.user2_ID.userValidCode == "1" &&
//         match.user2_ID.notificationStatus &&
//         match.user2_ID.deviceTokens
//       ) {
//         match.user2_ID.deviceTokens.forEach((token) => {
//           let isAndroidUser = match.user2_ID.osType == "0";

//           if (token) {
//             if (isAndroidUser) {
//               targetAndroidDevices.add(token);
//             } else {
//               targetIOSDevices.add(token);
//             }
//           }
//         });
//       }
//     });

//     //將 Set 轉換回陣列
//     const finalTargetAndroidUsers = Array.from(targetAndroidDevices);
//     const finalTargetIOSUsers = Array.from(targetIOSDevices);

//     const remindData = {
//       title: "💌 新的緣分來了！",
//       body: "🕊️ 新的配對已經送到，快開始你的緣分之旅吧！",
//       image: "",
//       behaviorType: "100",
//       navigateSign: "home",
//     };

//     await cloudMsgService.sendMsgToAndroidDevice(
//       finalTargetAndroidUsers,
//       remindData
//     );

//     await cloudMsgService.sendMsgToIOSDevice(finalTargetIOSUsers, remindData);
//   } catch (e) {
//     console.log("提醒用戶查看今天的配對", e);
//   }
// };

// runGeneralMatchRemind();
