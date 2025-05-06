const ActivityCircle = require("../models").activityCircle;
const CircleTicket = require("../models").circleTicket;
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

//星期六 00:00 刪掉沒有要延長的圈圈票券
//星期一 00:00 刪掉剩餘所有的圈圈票券
const startSchedule = async () => {
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

    if (day != 6 || day != 1) {
      console.log("今天是星期" + day + ",不執行銷毀票券業務");
    } else {
      if (day == 6) {
        console.log("今天是星期六");

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
        console.log("今天是星期一");
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

      console.log("已完成銷毀票券作業", "銷毀數量:" + result.deletedCount);
    }
  } catch (e) {
    console.log("銷毀票券作業異常", e);
  }
};

module.exports = startSchedule;
