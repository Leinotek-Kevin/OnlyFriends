const User = require("../models").user;
const UserRelation = require("../models").userRelation;
const Config = require("../models").config;
const MatchHistory = require("../models").matchHistory;
const MatchNewest = require("../models").matchNewest;
const dateUtil = require("../utils/date-util");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const sbUtil = require("../utils/sendbird-util");
const cloudAnnou = require("../utils/cloudAnnou-util");
const cloudStorage = require("../utils/cloudStorage-util");

//一般配對 00:00 執行
const generalMatch = async () => {
  const now = new Date();

  if (now.getHours() == 0 && now.getMinutes() == 0) {
    const RE_MATCH_DELAY = 48 * 60 * 60 * 1000;
    const time48HoursAgo = Date.now() - RE_MATCH_DELAY; // 計算48小時前的時間點
    const lastNightTimeStamp = dateUtil.getYesterdayNight();

    try {
      console.log("開始執行配對");
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
        },
      } = await Config.findOne({});

      if (generalDate == dateUtil.getToday()) {
        if (generalStatus == "2" || generalStatus == "1") {
          console.log("正在執行配對或今天已經執行過！");
          return;
        }
      }

      //標記正在配對的狀態
      await Config.updateOne({ "matchRecord.general.status": "1" });

      //發正在配對的訊息到openChannel
      try {
        await cloudAnnou.addAnnouMessage({
          customType: "matchStart",
          msg: "開始新一輪配對嚕！敬請期待",
          link: "",
          image: "",
        });
      } catch (e) {
        console.log("開始新一輪配對訊息發送失敗", e);
      }

      //刪掉已經被標記刪除帳號的用戶
      await User.deleteMany({ userValidCode: "3" });

      //儲存昨天的配對列表
      const pastMatches = await MatchNewest.find({});

      //清空最近的配對列表
      await MatchNewest.deleteMany({});

      //刪除大於過去兩天的歷史配對紀錄
      await MatchHistory.deleteMany({
        matchDate: { $lt: time48HoursAgo },
      });

      //儲存本次配對次數已用完的用戶
      let consumeUsers = new Set();

      //只有存活的用戶可以配對:昨天有上線的用戶即可
      const allowUsers = await User.find({
        lastLoginTime: { $gte: lastNightTimeStamp },
        userValidCode: "1",
        identity: 2,
      });

      //將存活的用戶隨機排序
      const aliveUsers = allowUsers.sort(() => Math.random() - 0.5);

      //執行有存活的用戶(訂閱用戶可以配對三個存活用戶/非訂閱只能一個)
      for (let i = 0; i < aliveUsers.length; i++) {
        const currentUser = aliveUsers[i];

        //如果這個用戶已經用完配對次數，就換下一個用戶執行
        if (consumeUsers.has(currentUser.userID)) {
          continue;
        }

        //查詢這個用戶最近48hr的配對紀錄
        const lastMatches = await MatchHistory.find({
          matchDate: { $gte: time48HoursAgo }, // 過去48小時到現在的配對
          $or: [
            { user1ID: currentUser.userID },
            { user2ID: currentUser.userID },
          ],
        });

        // 提取與 currentUser 最近48hr配對過的用戶ID
        const lastMatchedUserIds = lastMatches.map((match) =>
          match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
        );

        //這個用戶封鎖的對象
        let relation = await UserRelation.findOne({
          userID: currentUser.userID,
        });
        const unlikeObjects = relation == null ? [] : relation.unlikeUsers;

        //檢查目前這個用戶還剩下多少配對次數,沒訂閱不用檢查,因為只有一次
        let targetUserCount = 0;

        //檢查訂閱用戶剩餘次數
        if (currentUser.isSubscription) {
          //如果到期日是今天,要判斷用戶是否有繼續續訂,如果沒有繼續續訂,那視為非訂閱配對用戶
          if (
            currentUser.subExpiresDate == dateUtil.getToday() &&
            !currentUser.subAutoRenew
          ) {
            targetUserCount = 1;
          } else {
            const matchs = await MatchNewest.find({
              $or: [
                { user1ID: currentUser.userID },
                { user2ID: currentUser.userID },
              ],
            });

            //剩下配對的次數
            targetUserCount = 3 - matchs.length;
          }
        } else {
          targetUserCount = 1;
        }

        //合併排除的對象
        const consumeSetArray = Array.from(consumeUsers);
        const combinedArray = [
          ...lastMatchedUserIds,
          ...consumeSetArray,
          ...unlikeObjects,
        ];

        //用戶篩選條件
        let {
          objectCondition: {
            objectGender,
            objectAge: { maxAge, minAge },
            objectRegion,
          },
          //該用戶真人驗證狀態
        } = currentUser;

        maxAge = maxAge == 50 ? 200 : maxAge;

        //聚合篩選條件
        const targetUsers = await User.aggregate([
          {
            $match: {
              userID: {
                $ne: currentUser.userID,
                $nin: Array.from(combinedArray), //排除曾經配對及已經用光配對次數的用戶
              },
              lastLoginTime: { $gte: lastNightTimeStamp },
              userValidCode: "1",
              identity: { $ne: 3 }, // 排除 apple / google 官方人員
            },
          },
          {
            $addFields: {
              //篩選對象性別條件
              genderScore: {
                $cond: [{ $eq: ["$userGender", objectGender] }, 1, 0],
              },
              //篩選對象年齡條件
              ageScore: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$userAge", minAge] },
                      { $lte: ["$userAge", maxAge] },
                    ],
                  },
                  1,
                  0,
                ],
              },
              //篩選對象是否已通過真人辨識(需要用戶已經通過辨識才開放)
              realVerifyScore: {
                $cond: [
                  { $eq: [currentUser.realVerifyStatus, true] },
                  {
                    $cond: [
                      {
                        $eq: [
                          "$realVerifyStatus",
                          currentUser.realVerifyStatus,
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                  0,
                ],
              },
              //篩選對象所在區域條件(需要用戶訂閱才開放)
              regionScore: {
                $cond: [
                  { $eq: [currentUser.isSubscription, true] }, // 只有訂閱用戶才有地區篩選
                  {
                    $cond: [{ $eq: ["$userRegion", objectRegion] }, 1, 6],
                  },
                  0, // 如果當前用戶沒有訂閱，則區域對象 0
                ],
              },
              //篩選對象的興趣匹配(需要用戶訂閱才開放)
              interestedScore: {
                // $cond: [
                //   { $eq: [currentUser.isSubscription, true] }, // 只有訂閱用戶才有興趣加權
                // {
                $cond: [
                  {
                    $gt: [
                      {
                        $size: {
                          $setIntersection: [
                            { $ifNull: ["$userAttribute.interested", []] }, // 確保是陣列
                            {
                              $ifNull: [
                                currentUser.userAttribute.interested,
                                [],
                              ],
                            }, // 確保是陣列
                          ],
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $size: {
                      $setIntersection: [
                        { $ifNull: ["$userAttribute.interested", []] }, // 確保是陣列
                        {
                          $ifNull: [currentUser.userAttribute.interested, []],
                        }, // 確保是陣列
                      ],
                    },
                  },
                  0,
                ],
                // },
                //   0, // 如果當前用戶沒有訂閱，興趣加權為 0
                // ],
              },
            },
          },
          {
            $sort: {
              identity: -1, //依照用戶識別->降序 2:真人 ,1：官方, 0：假人
              interestedScore: -1, // 依照興趣匹配分數,降序
              realVerifyScore: -1, // 依照實名驗證匹配分數，降序
              genderScore: -1, //性別匹配的加權分數，降序
              ageScore: -1, // 年齡匹配的加權分數，降序
              regionScore: -1, // 地區匹配的加權分數，降序
            },
          },
          { $limit: targetUserCount },
        ]);

        consumeUsers.add(currentUser.userID);

        const matches = [];

        //紀錄配對
        for (let i = 0; i < targetUsers.length; i++) {
          let targetUser = targetUsers[i];

          let url =
            Number(currentUser.userID) > Number(targetUser.userID)
              ? `${targetUser.userID}_${currentUser.userID}`
              : `${currentUser.userID}_${targetUser.userID}`;

          let match = {
            user1ID: currentUser.userID, // 確保存儲 user1ID
            user2ID: targetUser.userID, // 確保存儲 user2ID
            user1_ID: currentUser._id, // 確保存儲 user1_ID
            user2_ID: targetUser._id, // 確保存儲 user2_ID
            sendbirdUrl: url, //渠道名稱
            isChecked: false, //是否已經校正過
            matchUIType: 1, //一般配對類型
          };

          if (targetUser.isSubscription) {
            //如果目標對象是訂閱用戶，就要額外檢查他的配對次數
            const targetAlreadyMatches = await MatchNewest.find({
              $or: [
                { user1ID: targetUser.userID },
                { user2ID: targetUser.userID },
              ],
            });

            if (targetAlreadyMatches.length == 2) {
              //如果這個用戶已經兩次了，那這個迴圈就是他的最後一次機會,就加入 consumeSet
              consumeUsers.add(targetUser.userID);
            }
          } else {
            //如果目標對象是非訂閱用戶，直接加入 consumeSet 即可,因為他只有一次機會
            consumeUsers.add(targetUser.userID);
          }

          matches.push(match);
        }

        await MatchNewest.insertMany(matches);
        await MatchHistory.insertMany(matches);
      }

      let finishTime = (Date.now() - time) / 1000.0;

      //標記已完成配對的狀態
      await Config.updateOne({
        "matchRecord.general.status": "2",
        "matchRecord.general.consumeTime": finishTime,
        "matchRecord.general.currentDate": dateUtil.getToday(),
      });

      //清除雲端有關聊天的多媒體檔案
      try {
        // 是否為測試環境
        const isDevelop =
          process.env.PORT == 8080 || process.env.HEROKU_ENV == "DEBUG";

        const envDir = isDevelop ? "develop" : "release";

        // 使用 Promise.all 同時調用 deleteFolderFiles 刪除三個資料夾中的檔案
        await Promise.all([
          cloudStorage.deleteFolderFiles(envDir + "/chat/audios/"),
          cloudStorage.deleteFolderFiles(envDir + "/chat/images/"),
          cloudStorage.deleteFolderFiles(envDir + "/chat/videos/"),
        ]);

        console.log("成功刪除所有有關聊天的檔案");
      } catch (e) {
        console.log("刪除所有有關聊天的檔案出現問題:", e);
      }

      //送出配對完成的 openchannel 廣播
      try {
        await cloudAnnou.addAnnouMessage({
          customType: "matchFinish",
          msg: "已完成新一輪配對嚕！",
          link: "",
          image: "",
        });
      } catch (e) {
        console.log("新一輪配對完成訊息發送失敗", e);
      }

      console.log("已完成配對！");

      //執行清掉昨天配對的列表渠道
      // 設置同時進行的最大請求數
      const pLimit = (await import("p-limit")).default;
      const limit = pLimit(5);

      const promises = pastMatches
        .filter((match) => match.isChecked) // 只過濾出 isChecked 為 true 的配對
        .map((match) =>
          limit(() => sbUtil.deleteGroupChannel(match.sendbirdUrl))
        );

      await Promise.all(promises);

      console.log("完成清理昨天的配對！");
    } catch (error) {
      console.log("配對出現問題" + error);
    }
  }
};

module.exports = generalMatch;

//執行一般配對
// const runGeneralMatch = async () => {
//   const RE_MATCH_DELAY = 48 * 60 * 60 * 1000;
//   const time48HoursAgo = Date.now() - RE_MATCH_DELAY; // 計算48小時前的時間點
//   const lastNightTimeStamp = dateUtil.getYesterdayNight();

//   try {
//     console.log("開始執行配對");
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
//       },
//     } = await Config.findOne({});

//     if (generalDate == dateUtil.getToday()) {
//       if (generalStatus == "2" || generalStatus == "1") {
//         console.log("正在執行配對或今天已經執行過！");
//         return;
//       }
//     }

//     //標記正在配對的狀態
//     await Config.updateOne({ "matchRecord.general.status": "1" });

//     //發正在配對的訊息到openChannel
//     try {
//       await cloudAnnou.addAnnouMessage({
//         customType: "matchStart",
//         msg: "開始新一輪配對嚕！敬請期待",
//         link: "",
//         image: "",
//       });
//     } catch (e) {
//       console.log("開始新一輪配對訊息發送失敗", e);
//     }

//     //刪掉已經被標記刪除帳號的用戶
//     await User.deleteMany({ userValidCode: "3" });

//     //儲存昨天的配對列表
//     const pastMatches = await MatchNewest.find({});

//     //清空最近的配對列表
//     await MatchNewest.deleteMany({});

//     //刪除大於過去兩天的歷史配對紀錄
//     await MatchHistory.deleteMany({
//       matchDate: { $lt: time48HoursAgo },
//     });

//     //儲存本次配對次數已用完的用戶
//     let consumeUsers = new Set();

//     //只有存活的用戶可以配對:昨天有上線的用戶即可
//     const allowUsers = await User.find({
//       lastLoginTime: { $gte: lastNightTimeStamp },
//       userValidCode: "1",
//       identity: 2,
//     });

//     //將存活的用戶隨機排序
//     const aliveUsers = allowUsers.sort(() => Math.random() - 0.5);

//     //執行有存活的用戶(訂閱用戶可以配對三個存活用戶/非訂閱只能一個)
//     for (let i = 0; i < aliveUsers.length; i++) {
//       const currentUser = aliveUsers[i];

//       //如果這個用戶已經用完配對次數，就換下一個用戶執行
//       if (consumeUsers.has(currentUser.userID)) {
//         continue;
//       }

//       //查詢這個用戶最近48hr的配對紀錄
//       const lastMatches = await MatchHistory.find({
//         matchDate: { $gte: time48HoursAgo }, // 過去48小時到現在的配對
//         $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
//       });

//       // 提取與 currentUser 最近48hr配對過的用戶ID
//       const lastMatchedUserIds = lastMatches.map((match) =>
//         match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
//       );

//       //這個用戶封鎖的對象
//       let relation = await UserRelation.findOne({
//         userID: currentUser.userID,
//       });
//       const unlikeObjects = relation == null ? [] : relation.unlikeUsers;

//       //檢查目前這個用戶還剩下多少配對次數,沒訂閱不用檢查,因為只有一次
//       let targetUserCount = 0;

//       //檢查訂閱用戶剩餘次數
//       if (currentUser.isSubscription) {
//         //如果到期日是今天,要判斷用戶是否有繼續續訂,如果沒有繼續續訂,那視為非訂閱配對用戶
//         if (
//           currentUser.subExpiresDate == dateUtil.getToday() &&
//           !currentUser.subAutoRenew
//         ) {
//           targetUserCount = 1;
//         } else {
//           const matchs = await MatchNewest.find({
//             $or: [
//               { user1ID: currentUser.userID },
//               { user2ID: currentUser.userID },
//             ],
//           });

//           //剩下配對的次數
//           targetUserCount = 3 - matchs.length;
//         }
//       } else {
//         targetUserCount = 1;
//       }

//       //合併排除的對象
//       const consumeSetArray = Array.from(consumeUsers);
//       const combinedArray = [
//         ...lastMatchedUserIds,
//         ...consumeSetArray,
//         ...unlikeObjects,
//       ];

//       //用戶篩選條件
//       let {
//         objectCondition: {
//           objectGender,
//           objectAge: { maxAge, minAge },
//           objectRegion,
//         },
//         //該用戶真人驗證狀態
//       } = currentUser;

//       maxAge = maxAge == 50 ? 200 : maxAge;

//       //聚合篩選條件
//       const targetUsers = await User.aggregate([
//         {
//           $match: {
//             userID: {
//               $ne: currentUser.userID,
//               $nin: Array.from(combinedArray), //排除曾經配對及已經用光配對次數的用戶
//             },
//             lastLoginTime: { $gte: lastNightTimeStamp },
//             userValidCode: "1",
//             identity: { $ne: 3 }, // 排除 apple / google 官方人員
//           },
//         },
//         {
//           $addFields: {
//             genderScore: {
//               $cond: [{ $eq: ["$userGender", objectGender] }, 1, 0],
//             },
//             ageScore: {
//               $cond: [
//                 {
//                   $and: [
//                     { $gte: ["$userAge", minAge] },
//                     { $lte: ["$userAge", maxAge] },
//                   ],
//                 },
//                 1,
//                 0,
//               ],
//             },
//             regionScore: {
//               $cond: [{ $eq: ["$userRegion", objectRegion] }, 1, 0],
//             },
//             realVerifyScore: {
//               // 如果當前用户的 realVerifyStatus 是 true, 則目標用户以 true 為優先
//               $cond: [
//                 { $eq: [currentUser.realVerifyStatus, true] },
//                 {
//                   $cond: [
//                     {
//                       $eq: ["$realVerifyStatus", currentUser.realVerifyStatus],
//                     },
//                     1,
//                     0,
//                   ],
//                 }, //
//                 1, // 當前用戶是 false 則不影響
//               ],
//             },
//           },
//         },
//         {
//           $sort: {
//             identity: -1, //依照用戶識別->降序 2:真人 ,1：官方, 0：假人
//             realVerifyScore: -1, // 依照實名驗證匹配分數，降序
//             genderScore: -1, //性別匹配的加權分數，降序
//             ageScore: -1, // 年齡匹配的加權分數，降序
//             regionScore: -1, // 地區匹配的加權分數，降序
//             realVerifyScore: -1, // 依照實名驗證匹配分數，降序
//           },
//         },
//         { $limit: targetUserCount },
//       ]);

//       consumeUsers.add(currentUser.userID);

//       const matches = [];

//       //紀錄配對
//       for (let i = 0; i < targetUsers.length; i++) {
//         let targetUser = targetUsers[i];

//         let url =
//           Number(currentUser.userID) > Number(targetUser.userID)
//             ? `${targetUser.userID}_${currentUser.userID}`
//             : `${currentUser.userID}_${targetUser.userID}`;

//         let match = {
//           user1ID: currentUser.userID, // 確保存儲 user1ID
//           user2ID: targetUser.userID, // 確保存儲 user2ID
//           user1_ID: currentUser._id, // 確保存儲 user1_ID
//           user2_ID: targetUser._id, // 確保存儲 user2_ID
//           sendbirdUrl: url, //渠道名稱
//           isChecked: false, //是否已經校正過
//           matchUIType: 1, //一般配對類型
//         };

//         if (targetUser.isSubscription) {
//           //如果目標對象是訂閱用戶，就要額外檢查他的配對次數
//           const targetAlreadyMatches = await MatchNewest.find({
//             $or: [
//               { user1ID: targetUser.userID },
//               { user2ID: targetUser.userID },
//             ],
//           });

//           if (targetAlreadyMatches.length == 2) {
//             //如果這個用戶已經兩次了，那這個迴圈就是他的最後一次機會,就加入 consumeSet
//             consumeUsers.add(targetUser.userID);
//           }
//         } else {
//           //如果目標對象是非訂閱用戶，直接加入 consumeSet 即可,因為他只有一次機會
//           consumeUsers.add(targetUser.userID);
//         }

//         matches.push(match);
//       }

//       await MatchNewest.insertMany(matches);
//       await MatchHistory.insertMany(matches);
//     }

//     let finishTime = (Date.now() - time) / 1000.0;

//     //標記已完成配對的狀態
//     await Config.updateOne({
//       "matchRecord.general.status": "2",
//       "matchRecord.general.consumeTime": finishTime,
//       "matchRecord.general.currentDate": dateUtil.getToday(),
//     });

//     //清除雲端有關聊天的多媒體檔案
//     try {
//       // 是否為測試環境
//       const isDevelop =
//         process.env.PORT == 8080 || process.env.HEROKU_ENV == "DEBUG";

//       const envDir = isDevelop ? "develop" : "release";

//       // 使用 Promise.all 同時調用 deleteFolderFiles 刪除三個資料夾中的檔案
//       await Promise.all([
//         cloudStorage.deleteFolderFiles(envDir + "/chat/audios/"),
//         cloudStorage.deleteFolderFiles(envDir + "/chat/images/"),
//         cloudStorage.deleteFolderFiles(envDir + "/chat/videos/"),
//       ]);

//       console.log("成功刪除所有有關聊天的檔案");
//     } catch (e) {
//       console.log("刪除所有有關聊天的檔案出現問題:", e);
//     }

//     //送出配對完成的 openchannel 廣播
//     try {
//       await cloudAnnou.addAnnouMessage({
//         customType: "matchFinish",
//         msg: "已完成新一輪配對嚕！",
//         link: "",
//         image: "",
//       });
//     } catch (e) {
//       console.log("新一輪配對完成訊息發送失敗", e);
//     }

//     console.log("已完成配對！");

//     //執行清掉昨天配對的列表渠道
//     // 設置同時進行的最大請求數
//     const pLimit = (await import("p-limit")).default;
//     const limit = pLimit(5);

//     const promises = pastMatches
//       .filter((match) => match.isChecked) // 只過濾出 isChecked 為 true 的配對
//       .map((match) =>
//         limit(() => sbUtil.deleteGroupChannel(match.sendbirdUrl))
//       );

//     await Promise.all(promises);

//     console.log("完成清理昨天的配對！");
//   } catch (error) {
//     console.log("配對出現問題" + error);
//   }
// };

// runGeneralMatch();
