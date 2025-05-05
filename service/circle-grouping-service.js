const User = require("../models").user;
const ReadyCircle = require("../models").readyCircle;
const dotenv = require("dotenv");
dotenv.config();
const sbUtil = require("../utils/sendbird-util");
const mongoose = require("mongoose");
const { CircleTopicIDS } = require("../config/enum");

//主題圈圈演算法
//1. 先將隨機池中的用戶平均分配到有人數的圈圈裡
//2. 再計算所有參加人數,如果總人數<2人,則不開團;若1<x<5,
//則將這些人全部塞入一個活躍的主題(報名人數>0的主題)

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

    //過濾掉 random 的列舉主題
    const nonRandomTopics = CircleTopicIDS.filter(
      (topic) => topic.itemID !== "random"
    ).map((topic) => topic.itemID);

    //找出有報名人數的主題圈圈
    const readyCircles = await ReadyCircle.find(
      {
        circleReadyUsers: { $ne: [] },
      },
      { _id: 0, circleTopicID: 1, circleReadyUsers: 1 }
    );

    console.log("資料庫查找資料:", readyCircles);

    // 拆分 random 跟其他主題圈圈
    const randomCircle = readyCircles.find((c) => c.circleTopicID === "random");
    // 其他有報名人數的主題圈圈
    const activityCircles = readyCircles.filter(
      (c) => c.circleTopicID !== "random"
    );

    //  1. 先將隨機池中的用戶平均分配到有人數的圈圈裡
    if (randomCircle && randomCircle.circleReadyUsers.length > 0) {
      if (activityCircles && activityCircles.length == 0) {
        //如果沒有其他報名的主題=> 就隨機開一個主題,讓這些人都進去這個主題
        const anyTopicID =
          nonRandomTopics[Math.floor(Math.random() * nonRandomTopics.length)];

        activityCircles.push({
          circleTopicID: anyTopicID,
          circleReadyUsers: randomCircle.circleReadyUsers,
        });

        //console.log("用戶都在 random , 隨機給一個主題:", activityCircles);
      } else {
        //如果有其他報名的主題,就將 random 用戶平均分配到有報名的主題
        const randomUsers = [...randomCircle.circleReadyUsers].sort(
          () => Math.random() - 0.5
        );
        let index = 0;

        while (randomUsers.length > 0) {
          const user = randomUsers.pop();
          const targetCircle = activityCircles[index % activityCircles.length];
          targetCircle.circleReadyUsers.push(user);
          index++;
        }

        //console.log("將 random 用戶平均分配到有報名的主題:", activityCircles);
      }
    }

    //---- 目前所有用戶都已經在 activityCircles ------//
    let finalCircleGroup = [];

    //2. 計算所有參加人數,如果總人數<2人,則不開團;若1<x<5,
    // 計算 activityCircles 的總報名人數
    let totalUsers = 0;
    activityCircles.forEach((circle) => {
      totalUsers += circle.circleReadyUsers.length;
    });

    //目前的活躍主題
    const activityTopicIDS = activityCircles.map((c) => c.circleTopicID);

    //console.log("目前的活躍主題", activityTopicIDS);

    //報名人數不足 2 人，不進行分組
    if (totalUsers < 2) {
      console.log("報名人數不足 2 人，不進行分組");
      return;
    } else if (totalUsers < 5) {
      //報名人數介於2-4 人，則將這些人都放入一個活躍主題
      const anyActivityTopicID =
        activityTopicIDS[Math.floor(Math.random() * activityTopicIDS.length)];

      const activityUserIDS = [];
      activityCircles.forEach((c) => {
        activityUserIDS.push(...c.circleReadyUsers);
      });

      finalCircleGroup.push({
        circleTopicID: anyActivityTopicID,
        circleReadyGroup: activityUserIDS,
      });
    } else {
      // 報名人數 >= 5 人 ,開始分群, 以 5 人一群為最優先原則 , 其次是 7 ,再來是 4 , 6
      // 先依照5人區分人數多與少的活躍圈圈 (<5:人數少)
      let lessActivityCircles = [];
      let largeActivityCircles = [];

      activityCircles.forEach((c) => {
        if (c.circleReadyUsers.length < 5) {
          lessActivityCircles.push(c);
        } else {
          largeActivityCircles.push(c);
        }
      });

      // 1. 先處理較少人數的主題圈圈
      let lessUsers = [];
      let lessActivityTopicIDS = [];
      lessActivityCircles.forEach((c) => {
        lessUsers.push(...c.circleReadyUsers);
        lessActivityTopicIDS.push(c.circleTopicID);
      });

      //如果少數人的總和<5人,就將這些人再平均分配到人數多的圈圈
      if (lessUsers.length < 5) {
        const randomLessUsers = lessUsers.sort(() => Math.random() - 0.5);
        let index = 0;

        while (randomLessUsers.length > 0) {
          const user = randomLessUsers.pop();
          const targetCircle =
            largeActivityCircles[index % largeActivityCircles.length];
          targetCircle.circleReadyUsers.push(user);
          index++;
        }
      } else {
        //反之,總和>=5人,就將這些人合併到少數人的其中一個主題,並分群
        const anyLessActivityTopicID =
          lessActivityTopicIDS[
            Math.floor(Math.random() * lessActivityTopicIDS.length)
          ];

        const lessSliceGroups = sliceGroupUsers(lessUsers);

        lessSliceGroups.forEach((group) => {
          finalCircleGroup.push({
            circleTopicID: anyLessActivityTopicID,
            circleReadyGroup: group,
          });
        });
      }

      // 2. 處理較多人數的主題圈圈
      largeActivityCircles.forEach((largeCircle) => {
        const topicID = largeCircle.circleTopicID;
        const largeSliceGroups = sliceGroupUsers(largeCircle.circleReadyUsers);

        largeSliceGroups.forEach((group) => {
          finalCircleGroup.push({
            circleTopicID: topicID,
            circleReadyGroup: group,
          });
        });
      });

      console.log("最終的結果", finalCircleGroup);
    }
  } catch (e) {
    console.log(e);
  }
};

//切割群組的用戶群,以5人一組,若遇到剩下 1 或 2 人 ,則併入最後一組讓他成為 6 或 7人
//若遇到剩下 3 或 4 人 , 則一樣併入最後一組,並拆分為 4 和 4 兩組 或 5 和 4
const sliceGroupUsers = (userIDS) => {
  const tmpSliceGroup = [];
  const quotient = Math.floor(userIDS.length / 5); // 計算可切出幾組完整的 5 人小組
  const remainder = userIDS.length % 5; // 剩下未滿一組的人數

  // 先處理完整的 5 人小組
  for (let i = 0; i < quotient; i++) {
    const group = userIDS.slice(i * 5, (i + 1) * 5); // 每次取 5 人
    tmpSliceGroup.push(group);
  }

  // 若有剩下的少數幾人，處理尾端分組邏輯
  if (remainder > 0) {
    const start = quotient * 5; // 剩下的開始位置
    const extra = userIDS.slice(start); // 取出多出來的 1–4 人

    if (remainder === 1 || remainder === 2) {
      // 1 或 2 人直接併入最後一組（變成 6 或 7 人組）
      tmpSliceGroup[tmpSliceGroup.length - 1].push(...extra);
    } else if (remainder === 3) {
      // 將最後一組（5 人）加上 3 人變成 8 人 → 拆成 2 組，各 4 人
      const last = tmpSliceGroup.pop().concat(extra); // 先取出最後一組，加上新的人
      tmpSliceGroup.push(last.slice(0, 4)); // 前 4 人一組
      tmpSliceGroup.push(last.slice(4)); // 後 4 人一組
    } else if (remainder === 4) {
      // 將最後一組（5 人）加上 4 人變成 9 人 → 拆成 5 + 4
      const last = tmpSliceGroup.pop().concat(extra);
      tmpSliceGroup.push(last.slice(0, 5)); // 前 5 人一組
      tmpSliceGroup.push(last.slice(5)); // 後 4 人一組
    }
  }
  return tmpSliceGroup;
};

module.exports = startSchedule;
