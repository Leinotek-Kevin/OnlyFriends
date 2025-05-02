const User = require("../models").user;
const ReadyCircle = require("../models").readyCircle;
const dotenv = require("dotenv");
dotenv.config();
const sbUtil = require("../utils/sendbird-util");
const mongoose = require("mongoose");
const { CircleTopicIDS } = require("../config/enum");

const startSchedule = async () => {
  try {
    //連結 mongoDB
    // mongoose
    //   .connect(process.env.MONGODB_CONNECTION)
    //   .then(() => {
    //     console.log("連結到 mongoDB");
    //   })
    //   .catch((e) => {
    //     console.log(e);
    //   });

    //過濾掉 random 的列舉主題
    const nonRandomTopics = CircleTopicIDS.filter(
      (topic) => topic.itemID !== "random"
    ).map((topic) => topic.itemID);

    const readyCircles = await ReadyCircle.find(
      {
        circleReadyUsers: { $ne: [] },
      },
      { _id: 0, circleTopicID: 1, circleReadyUsers: 1 }
    );

    //活躍主題,排除 randomTopic
    const activeTopics = readyCircles
      .filter((circle) => circle.circleTopicID !== "random")
      .map((circle) => circle.circleTopicID);

    if (activeTopics && activeTopics.length == 0) {
      //如果是空陣列,表示所有人都在 random , 那隨機給他一個
      activeTopics.push(
        nonRandomTopics[Math.floor(Math.random() * nonRandomTopics.length)]
      );
    }

    //已分配完成的圈圈群組
    //結構跟readyCircles一樣
    const finalCircleGroup = [];

    //先判斷總報名人數有沒有過五個人
    let caluUsersCount = 0;
    let tmpSaveUsers = [];
    let hasMoreThanFive = false;

    for (const circle of readyCircles) {
      caluUsersCount += circle.circleReadyUsers.length;
      tmpSaveUsers.push(...circle.circleReadyUsers);

      if (caluUsersCount >= 5) {
        hasMoreThanFive = true;
        break; // 已經超過就不需要繼續跑
      }
    }

    //如果沒有超過五個人
    if (!hasMoreThanFive) {
      //至少要有2人才可以成團
      if (caluUsersCount >= 2) {
        //處理總人數僅 2-4 人 => 將這些人直接配到報名人數大於0的主題
        //隨機插入一個待選活躍主題
        const randomTopic =
          activeTopics[Math.floor(Math.random() * activeTopics.length)];

        finalCircleGroup.push({
          circleTopicID: randomTopic,
          circleReadyUsers: tmpSaveUsers,
        });
      } else {
        console.log("主題圈圈群組至少要有兩個人");
      }
    } else {
      //圈圈總人數>5人
      //1.先將 random 圈圈中的人,報名到人數不滿5人的圈圈
      //2.再將小於5人的圈圈中的用戶集合起來分群,分群可以是 4,5,6,7 人一組 , 優先5 or 7 人一組
      //3.
    }
  } catch (e) {
    console.log(e);
  }
};

module.exports = startSchedule;
