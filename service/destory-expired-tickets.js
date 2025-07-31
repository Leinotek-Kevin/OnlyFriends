const ActivityCircle = require("../models").activityCircle;
const CircleTicket = require("../models").circleTicket;
const cloudAnnou = require("../utils/cloudAnnou-util");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

//星期六 00:00 刪掉沒有要延長的圈圈票券
//星期一 00:00 刪掉剩餘所有的圈圈票券
const startSchedule = async () => {
  //台灣時間
  const day = new Date(Date.now()).getDay();
  const now = new Date();

  //現在是星期一或六的凌晨0點
  if ((day == 1 || day == 6) && now.getHours() == 0 && now.getMinutes() == 0) {
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

      //如果今天是星期六,則刪掉沒有贊成延長的圈圈用戶票券; 星期一～三就刪除全部
      const day = new Date(Date.now()).getDay();
      const targetUsers = [];

      //今天星期六
      if (day == 6) {
        const nonExtendCircles = await ActivityCircle.find(
          {
            "circleVoteBox.agreeVoteRate": { $lt: 50 },
          },
          { _id: 0, circleUserIDS: 1 }
        );

        nonExtendCircles.forEach((circle) => {
          targetUsers.push(...circle.circleUserIDS);
        });
      } else if (day == 1) {
        const allCircles = await ActivityCircle.find(
          {},
          { _id: 0, circleUserIDS: 1 }
        );

        allCircles.forEach((circle) => {
          targetUsers.push(...circle.circleUserIDS);
        });
      }

      const result = await CircleTicket.deleteMany({
        ticketOwnerID: { $in: targetUsers },
      });

      console.log(
        "今天是星期" + day + "已完成銷毀票券作業",
        "銷毀數量:" + result.deletedCount
      );

      await cloudAnnou.addAnnouMessage({
        customType: "circleClosing",
        msg: "主題圈圈已經關閉嚕！",
        link: "",
        image: "",
      });
    } catch (e) {
      console.log("銷毀票券作業異常", e);
    }
  }
};

module.exports = startSchedule;
