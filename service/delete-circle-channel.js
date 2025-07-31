const ActivityCircle = require("../models").activityCircle;
const sbUtil = require("../utils/sendbird-util");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const cloudAnnou = require("../utils/cloudAnnou-util");
const cloudStorage = require("../utils/cloudStorage-util");
const Bottleneck = require("bottleneck");

//星期一～星期三 05:00 執行刪除渠道作業
//其中一和二批量刪除一半,三則全部刪除
const startSchedule = async () => {
  //台灣時間
  let day = new Date(Date.now()).getDay();
  const now = new Date();

  //現在是星期一～三的 凌晨５點
  if (day > 0 && day < 4 && now.getHours() == 5 && now.getMinutes() == 0) {
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

      const circles = await ActivityCircle.find(
        {
          circleChannelID: { $ne: "liquor-1_0123456789" },
        },
        { _id: 0, circleChannelID: 1 }
      );

      //   console.log("所有渠道", circles);
      //   console.log("渠道數量", circles.length);

      const deleteChannels = [];

      if (day == 1 || day == 2) {
        //星期一或二,每次刪除一半
        for (let i = 0; i < circles.length / 2; i++) {
          deleteChannels.push(circles[i].circleChannelID);
        }

        //刪除 circle 公告訊息 ＆ 主題圈圈的多媒體資料
        try {
          //刪除過去的 circle 公告訊息
          await cloudAnnou.removeAnnouMsgByType("circleClosing");

          // 是否為測試環境
          const isDevelop =
            process.env.PORT == 8080 || process.env.HEROKU_ENV == "DEBUG";

          const envDir = isDevelop ? "develop" : "release";

          // 使用 Promise.all 同時調用 deleteFolderFiles 刪除三個資料夾中的檔案
          await Promise.all([
            cloudStorage.deleteFolderFiles(envDir + "/circle-chat/audios/"),
            cloudStorage.deleteFolderFiles(envDir + "/circle-chat/images/"),
            cloudStorage.deleteFolderFiles(envDir + "/circle-chat/videos/"),
          ]);

          console.log("成功刪除所有有關圈圈聊天的檔案");
        } catch (e) {
          console.log("刪除所有有關圈圈聊天的檔案出現問題:", e);
        }
      } else if (day == 3) {
        //星期三,全部刪掉
        circles.forEach((circle) => {
          deleteChannels.push(circle.circleChannelID);
        });
      }

      //console.log("目標刪除渠道", deleteChannels);

      if (deleteChannels.length == 0) {
        console.log("沒有圈圈渠道需要刪除");
      } else {
        const limiter = new Bottleneck({
          maxConcurrent: 1, // 一次只執行一個任務
          minTime: 120, // 每次任務至少間隔 100ms
        });

        for (const channel of deleteChannels) {
          await limiter.schedule(async () => {
            const status = await sbUtil.deleteGroupChannel(channel);

            if (status) {
              await ActivityCircle.deleteMany({
                circleChannelID: channel,
              });
            }
          });
        }

        console.log("刪除圈圈渠道已完成");
      }
    } catch (e) {
      console.log("刪除圈圈渠道異常", e);
    }
  }
};

module.exports = startSchedule;

// 設定每次最多允許 5 個並行請求
// const pLimit = (await import("p-limit")).default;
// const limit = pLimit(5);

// const deletePromises = deleteChannels.map((channel) => {
//   return limit(async () => {
//     const status = await sbUtil.deleteGroupChannel(channel);

//     if (status) {
//       return ActivityCircle.deleteMany({
//         circleChannelID: channel,
//       });
//     }
//   });
// });

// // 等待所有異步操作完成
// await Promise.all(deletePromises);
