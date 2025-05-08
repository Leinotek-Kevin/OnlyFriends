const ActivityCircle = require("../models").activityCircle;
const sbUtil = require("../utils/sendbird-util");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

//星期一～星期三 05:00 執行刪除渠道作業
//其中一和二批量刪除一半,三則全部刪除
const startSchedule = async () => {
  const day = new Date(Date.now()).getDay();
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
        // 設定每次最多允許 5 個並行請求
        const pLimit = (await import("p-limit")).default;
        const limit = pLimit(5);

        const deletePromises = deleteChannels.map((channel) => {
          return limit(async () => {
            const status = await sbUtil.deleteGroupChannel(channel);

            if (status) {
              return ActivityCircle.deleteMany({
                circleChannelID: channel,
              });
            }
          });
        });

        // 等待所有異步操作完成
        await Promise.all(deletePromises);

        console.log("刪除圈圈渠道已完成");
      }
    } catch (e) {
      console.log("刪除圈圈渠道異常", e);
    }
  } else {
    console.log("今天星期" + day, "目前不會執行刪除圈圈渠道業務");
  }
};

module.exports = startSchedule;
