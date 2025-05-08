const User = require("../models").user;
const CircleTicket = require("../models").circleTicket;
const ReadyCircle = require("../models").readyCircle;
const ActivityCircle = require("../models").activityCircle;
const dotenv = require("dotenv");
dotenv.config();
const sbUtil = require("../utils/sendbird-util");
const cloudAnnou = require("../utils/cloudAnnou-util");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { CircleTopicNames } = require("../config/enum");

//主題圈圈分群演算法
// 1.查找資料庫中有報名人數的主題圈圈
// 2.拆分隨機主題 和 其他有報名人數的主題
// 3.將隨機主題的用戶平均分配到其他有報名的主題,若全部人都在隨機主題,則隨機開一個主題,讓這些人都進去
// 4.計算所有參加人數,如果總人數 <2 人,則不成團 ;若介於 2-4 人，則將這些人都放入一個有報名人數的主題
// 5.若總人數 >= 5人,則先區分大圈圈和小圈圈,大圈圈是滿五人以上
// 6.先處理主題人數較少的圈圈,如果較少人的圈圈總人數 <５人,則將這些人再平均分配給人數多的大圈圈
// 7.若較少人的圈圈總人數 >= 5人,則將這些人塞進隨機一個少數人選過的主題,並開始分群
// 8.將大圈圈分群

// 分群原則
// 1.優先以5個人為主,若有餘數,如:1 or 2,則併入最後一團,形成6 or 7人一組
// 2.若餘數是 3 ,先併入最後一組 ,並拆成 4 和 4 兩組
// 3.若餘數是 4 ,則直接將這4人作為一組

//主題圈圈分群排程 , 每週四 凌晨4點
const startSchedule = async () => {
  const day = new Date(Date.now()).getDay();

  const now = new Date();
  //現在是週四凌晨4點
  if (day == 4 && now.getHours() == 4 && now.getMinutes() == 0) {
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
      const nonRandomTopics = CircleTopicNames.filter(
        (topic) => topic.itemID !== "random"
      ).map((topic) => topic.itemID);

      //列出所有主題圈圈的主題參數(色系,背景)
      const circleTopicParams = await ReadyCircle.find(
        {
          circleTopicID: { $ne: "random" },
        },
        {
          _id: 0,
          circleTopicID: 1,
          circleTopicName: 1,
          circleTopicColors: 1,
          circleBackground: 1,
          circleTopicLogo: 1,
        }
      );

      //找出有報名人數的主題圈圈
      const readyCircles = await ReadyCircle.find(
        {
          circleReadyUsers: { $ne: [] },
        },
        { _id: 0, circleTopicID: 1, circleReadyUsers: 1 }
      );

      //console.log("資料庫查找資料:", readyCircles);

      // 拆分 random 跟其他主題圈圈
      const randomCircle = readyCircles.find(
        (c) => c.circleTopicID === "random"
      );
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
            const targetCircle =
              activityCircles[index % activityCircles.length];
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

          const users = await User.find(
            {
              userID: { $in: lessUsers },
            },
            { _id: 0, userID: 1, userRegion: 1 }
          );

          const sortedUserIDS = users
            .sort(
              (a, b) => regionOrder[a.userRegion] - regionOrder[b.userRegion]
            )
            .map((user) => user.userID);

          const lessSliceGroups = sliceGroupUsers(sortedUserIDS);

          lessSliceGroups.forEach((group) => {
            finalCircleGroup.push({
              circleTopicID: anyLessActivityTopicID,
              circleReadyGroup: group,
            });
          });
        }

        // 2. 處理較多人數的主題圈圈
        for (const largeCircle of largeActivityCircles) {
          const topicID = largeCircle.circleTopicID;

          const users = await User.find(
            {
              userID: { $in: largeCircle.circleReadyUsers },
            },
            { _id: 0, userID: 1, userRegion: 1 }
          );

          const sortedUserIDS = users
            .sort(
              (a, b) => regionOrder[a.userRegion] - regionOrder[b.userRegion]
            )
            .map((user) => user.userID);

          const largeSliceGroups = sliceGroupUsers(sortedUserIDS);

          largeSliceGroups.forEach((group) => {
            finalCircleGroup.push({
              circleTopicID: topicID,
              circleReadyGroup: group,
            });
          });
        }
      }

      console.log("最終的結果", finalCircleGroup);

      //----------------- 以分群完畢, 開始創建 ActivityCircle 和 SendBird Channel
      // 設定每次最多允許 5 個並行請求
      const pLimit = (await import("p-limit")).default;
      const limit = pLimit(5);

      const createPromises = finalCircleGroup.map((circleGroup) => {
        return limit(async () => {
          const { circleTopicID, circleReadyGroup } = circleGroup;

          const uuid = uuidv4(); // 生成 UUID v4
          const circleID = uuid.replace(/\D/g, "").slice(0, 10);
          const circleChannelID = circleTopicID + "_" + circleID;

          const status = await sbUtil.createCircleChannel(
            circleReadyGroup,
            circleID,
            circleChannelID
          );

          const param = circleTopicParams.find((param) => {
            return param.circleTopicID == circleTopicID;
          });

          if (status) {
            await ActivityCircle.create({
              circleID,
              circleTopicID,
              circleTopicName: param.circleTopicName,
              circleChannelID,
              circleTopicColors: param.circleTopicColors,
              circleBackground: param.circleBackground,
              circleTopicLogo: param.circleTopicLogo,
              circleUserIDS: circleReadyGroup,
            });

            await CircleTicket.updateMany(
              {
                ticketOwnerID: { $in: circleReadyGroup },
              },
              {
                circleChannelID,
              }
            );
          }
        });
      });

      // 等待所有異步操作完成
      await Promise.all(createPromises);

      // 將預備圈圈的所有主題的 circleReadyUsers 清空
      await ReadyCircle.updateMany({}, { $set: { circleReadyUsers: [] } });

      console.log("圈圈分群已完成");

      //刪除過去的 circle 公告訊息
      await cloudAnnou.removeAnnouMsgByType("circle");
    } catch (e) {
      console.log("圈圈分群遇到問題", e);
    }
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

//地區排序代號
const regionOrder = {
  A: 1, // 台北
  F: 2, // 新北
  C: 3, // 基隆
  H: 4, // 桃園
  J: 5, // 新竹
  K: 6, // 苗栗
  B: 7, // 台中
  N: 8, // 彰化
  M: 9, // 南投
  P: 10, // 雲林
  Q: 11, // 嘉義
  D: 12, // 台南
  E: 13, // 高雄
  S: 14, // 屏東
  V: 15, // 台東
  U: 16, // 花蓮
  G: 17, // 宜蘭
  X: 18, // 澎湖
  W: 19, // 金門
  Z: 20, // 連江
};

module.exports = startSchedule;
