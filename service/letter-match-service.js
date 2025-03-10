const MatchNewest = require("../models").matchNewest;
const EmotionLetter = require("../models").letter;
const dateUtil = require("../utils/date-util");
const storageUtil = require("../utils/cloudStorage-util");
const cloudAnnou = require("../utils/cloudAnnou-util");
const mongoose = require("mongoose");
const Config = require("../models").config;
const dotenv = require("dotenv");
dotenv.config();

//心情樹洞配對 03:00 執行
const letterMatch = async () => {
  const now = new Date();

  if (now.getHours() == 3 && now.getMinutes() == 0) {
    try {
      console.log("開始執行樹洞配對");
      let time = Date.now();

      //連結 mongoDB
      mongoose
        .connect(process.env.MONGODB_CONNECTION)
        .then(() => {
          console.log("連結到 mongoDB");
        })
        .catch((e) => {
          console.log(e);
        });

      //當今天的一般配對執行完畢，才可以執行樹洞配對
      let {
        matchRecord: {
          general: { currentDate: generalDate, status: generalStatus },
          letter: { currentDate: letterDate, status: letterStatus },
        },
      } = await Config.findOne({});

      if (generalDate != dateUtil.getToday() || generalStatus != "2") {
        console.log("今天的一般配對還沒完成！不可以執行樹洞配對");
        return;
      }

      if (letterDate == dateUtil.getToday()) {
        if (letterStatus == "2" || letterStatus == "1") {
          console.log("正在執行樹洞配對或今天已經執行過！");
          return;
        }
      }

      //標記正在樹洞配對的狀態
      await Config.updateOne({ "matchRecord.letter.status": "1" });

      const lastNightTimeStamp = dateUtil.getYesterdayNight();
      const todayNightTimeStamp = dateUtil.getTodayNight();

      //昨天午夜到現在午夜的信封
      const allowLettersCount = await EmotionLetter.countDocuments({
        createTime: { $gte: lastNightTimeStamp, $lt: todayNightTimeStamp },
      });

      // 根據總數量決定百分比
      // 100人->20% ,1000人->15% , 5000人-> 10%
      let percentage;
      if (allowLettersCount <= 100) {
        percentage = 0.2;
      } else if (allowLettersCount <= 1000) {
        percentage = 0.15;
      } else if (allowLettersCount <= 5000) {
        percentage = 0.1;
      }

      // 計算應該配對的數量
      const sampleSize = Math.ceil((allowLettersCount * percentage) / 2);

      // 使用 MongoDB 的聚合管道來隨機取樣
      let randomLetters = await EmotionLetter.aggregate([
        {
          $match: {
            createTime: {
              $gte: lastNightTimeStamp, // 大於等於昨晚的時間
              $lt: todayNightTimeStamp, // 小於今天晚上的時間
            },
          },
        },
        {
          $sample: { size: sampleSize }, // 隨機取樣
        },
      ]);

      let letterMatches = [];

      //儲存本次配對次數已用完的信封
      let consumeUsers = new Set();

      //讀取郵戳樣式
      const marks = await storageUtil.getImagesByFolder("system/letter-mark");

      for (let i = 0; i < randomLetters.length; i++) {
        //當前候選信封
        const currentLetter = randomLetters[i];

        //如果這個信封已經用完配對次數，就換下一個信封執行
        if (consumeUsers.has(currentLetter.letterUserID)) {
          continue;
        }

        //查詢這個信封在今天午夜配對的紀錄
        const lastMatches = await MatchNewest.find({
          $or: [
            { user1ID: currentLetter.letterUserID },
            { user2ID: currentLetter.letterUserID },
          ],
        });

        // 過濾 currentLetter 今天午夜配對的對象
        const lastMatchedUserIds = lastMatches.map((match) =>
          match.user1ID === currentLetter.letterUserID
            ? match.user2ID
            : match.user1ID
        );

        //合併不能被配對到的對象
        const consumeSetArray = Array.from(consumeUsers);
        const combinedArray = [...lastMatchedUserIds, ...consumeSetArray];

        //找尋目標用戶
        const targetLetters = await EmotionLetter.aggregate([
          {
            $match: {
              letterUserID: {
                $ne: currentLetter.letterUserID,
                $nin: Array.from(combinedArray), //排除曾經配對及已經用光配對次數的用戶
              },
              createTime: {
                $gte: lastNightTimeStamp, // 大於等於昨晚的時間
                $lt: todayNightTimeStamp, // 小於今天晚上的時間
              },
            },
          },
          { $limit: 1 },
        ]);

        if (targetLetters != null && targetLetters.length > 0) {
          consumeUsers.add(targetLetters[0].letterUserID);
          consumeUsers.add(currentLetter.letterUserID);

          //隨機抽樣郵戳
          let letterMark = "";
          if (marks && marks.length > 0) {
            const randomIndex = Math.floor(Math.random() * marks.length);
            letterMark = marks[randomIndex];
          }

          //紀錄配對用戶
          let url =
            Number(currentLetter.letterUserID) >
            Number(targetLetters[0].letterUserID)
              ? `${targetLetters[0].letterUserID}_${currentLetter.letterUserID}`
              : `${currentLetter.letterUserID}_${targetLetters[0].letterUserID}`;

          let match = {
            user1ID: currentLetter.letterUserID, // 確保存儲 user1ID
            user2ID: targetLetters[0].letterUserID, // 確保存儲 user2ID
            user1_ID: currentLetter.letterUser, // 確保存儲 user1_ID
            user2_ID: targetLetters[0].letterUser, // 確保存儲 user2_ID
            sendbirdUrl: url,
            isChecked: false,
            user1letterContent: currentLetter.letterContent,
            user2letterContent: targetLetters[0].letterContent,
            letterMark,
            matchUIType: 2,
          };

          letterMatches.push(match);
        }
      }

      await EmotionLetter.deleteMany({
        letterUserID: { $in: Array.from(consumeUsers) }, // 使用 $in 查詢在 consumeUsers 中的用戶
      });

      await MatchNewest.insertMany(letterMatches);

      let finishTime = (Date.now() - time) / 1000.0;

      //標記已完成配對的狀態
      await Config.updateOne({
        "matchRecord.letter.status": "2",
        "matchRecord.letter.consumeTime": finishTime,
        "matchRecord.letter.currentDate": dateUtil.getToday(),
      });

      console.log("心情樹洞配對完成");

      //刪除公告裡的 match 訊息
      await cloudAnnou.removeAnnouMsgByType("match");
    } catch (e) {
      console.log("心情樹洞配對有問題", e);
    }
  }
};

module.exports = letterMatch;

// const runLetterMatch = async () => {
//   try {
//     console.log("開始執行樹洞配對");
//     let time = Date.now();

//     //連結 mongoDB
//     mongoose
//       .connect(process.env.MONGODB_CONNECTION)
//       .then(() => {
//         console.log("連結到 mongoDB");
//       })
//       .catch((e) => {
//         console.log(e);
//       });

//     //當今天的一般配對執行完畢，才可以執行樹洞配對
//     let {
//       matchRecord: {
//         general: { currentDate: generalDate, status: generalStatus },
//         letter: { currentDate: letterDate, status: letterStatus },
//       },
//     } = await Config.findOne({});

//     if (generalDate != dateUtil.getToday() || generalStatus != "2") {
//       console.log("今天的一般配對還沒完成！不可以執行樹洞配對");
//       return;
//     }

//     if (letterDate == dateUtil.getToday()) {
//       if (letterStatus == "2" || letterStatus == "1") {
//         console.log("正在執行樹洞配對或今天已經執行過！");
//         return;
//       }
//     }

//     //標記正在樹洞配對的狀態
//     await Config.updateOne({ "matchRecord.letter.status": "1" });

//     const lastNightTimeStamp = dateUtil.getYesterdayNight();
//     const todayNightTimeStamp = dateUtil.getTodayNight();

//     //昨天午夜到現在午夜的信封
//     const allowLettersCount = await EmotionLetter.countDocuments({
//       createTime: { $gte: lastNightTimeStamp, $lt: todayNightTimeStamp },
//     });

//     // 根據總數量決定百分比
//     // 100人->20% ,1000人->15% , 5000人-> 10%
//     let percentage;
//     if (allowLettersCount <= 100) {
//       percentage = 0.2;
//     } else if (allowLettersCount <= 1000) {
//       percentage = 0.15;
//     } else if (allowLettersCount <= 5000) {
//       percentage = 0.1;
//     }

//     // 計算應該配對的數量
//     const sampleSize = Math.ceil((allowLettersCount * percentage) / 2);

//     // 使用 MongoDB 的聚合管道來隨機取樣
//     let randomLetters = await EmotionLetter.aggregate([
//       {
//         $match: {
//           createTime: {
//             $gte: lastNightTimeStamp, // 大於等於昨晚的時間
//             $lt: todayNightTimeStamp, // 小於今天晚上的時間
//           },
//         },
//       },
//       {
//         $sample: { size: sampleSize }, // 隨機取樣
//       },
//     ]);

//     let letterMatches = [];

//     //儲存本次配對次數已用完的信封
//     let consumeUsers = new Set();

//     //讀取郵戳樣式
//     const marks = await storageUtil.getImagesByFolder("system/letter-mark");

//     for (let i = 0; i < randomLetters.length; i++) {
//       //當前候選信封
//       const currentLetter = randomLetters[i];

//       //如果這個信封已經用完配對次數，就換下一個信封執行
//       if (consumeUsers.has(currentLetter.letterUserID)) {
//         continue;
//       }

//       //查詢這個信封在今天午夜配對的紀錄
//       const lastMatches = await MatchNewest.find({
//         $or: [
//           { user1ID: currentLetter.letterUserID },
//           { user2ID: currentLetter.letterUserID },
//         ],
//       });

//       // 過濾 currentLetter 今天午夜配對的對象
//       const lastMatchedUserIds = lastMatches.map((match) =>
//         match.user1ID === currentLetter.letterUserID
//           ? match.user2ID
//           : match.user1ID
//       );

//       //合併不能被配對到的對象
//       const consumeSetArray = Array.from(consumeUsers);
//       const combinedArray = [...lastMatchedUserIds, ...consumeSetArray];

//       //找尋目標用戶
//       const targetLetters = await EmotionLetter.aggregate([
//         {
//           $match: {
//             letterUserID: {
//               $ne: currentLetter.letterUserID,
//               $nin: Array.from(combinedArray), //排除曾經配對及已經用光配對次數的用戶
//             },
//             createTime: {
//               $gte: lastNightTimeStamp, // 大於等於昨晚的時間
//               $lt: todayNightTimeStamp, // 小於今天晚上的時間
//             },
//           },
//         },
//         { $limit: 1 },
//       ]);

//       if (targetLetters != null && targetLetters.length > 0) {
//         consumeUsers.add(targetLetters[0].letterUserID);
//         consumeUsers.add(currentLetter.letterUserID);

//         //隨機抽樣郵戳
//         let letterMark = "";
//         if (marks && marks.length > 0) {
//           const randomIndex = Math.floor(Math.random() * marks.length);
//           letterMark = marks[randomIndex];
//         }

//         //紀錄配對用戶
//         let url =
//           Number(currentLetter.letterUserID) >
//           Number(targetLetters[0].letterUserID)
//             ? `${targetLetters[0].letterUserID}_${currentLetter.letterUserID}`
//             : `${currentLetter.letterUserID}_${targetLetters[0].letterUserID}`;

//         let match = {
//           user1ID: currentLetter.letterUserID, // 確保存儲 user1ID
//           user2ID: targetLetters[0].letterUserID, // 確保存儲 user2ID
//           user1_ID: currentLetter.letterUser, // 確保存儲 user1_ID
//           user2_ID: targetLetters[0].letterUser, // 確保存儲 user2_ID
//           sendbirdUrl: url,
//           isChecked: false,
//           user1letterContent: currentLetter.letterContent,
//           user2letterContent: targetLetters[0].letterContent,
//           letterMark,
//           matchUIType: 2,
//         };

//         letterMatches.push(match);
//       }
//     }

//     await EmotionLetter.deleteMany({
//       letterUserID: { $in: Array.from(consumeUsers) }, // 使用 $in 查詢在 consumeUsers 中的用戶
//     });

//     await MatchNewest.insertMany(letterMatches);

//     let finishTime = (Date.now() - time) / 1000.0;

//     //標記已完成配對的狀態
//     await Config.updateOne({
//       "matchRecord.letter.status": "2",
//       "matchRecord.letter.consumeTime": finishTime,
//       "matchRecord.letter.currentDate": dateUtil.getToday(),
//     });

//     console.log("心情樹洞配對完成");

//     //刪除公告裡的 match 訊息
//     await cloudAnnou.removeAnnouMsgByType("match");
//   } catch (e) {
//     console.log("心情樹洞配對有問題", e);
//   }
// };

// runLetterMatch();
