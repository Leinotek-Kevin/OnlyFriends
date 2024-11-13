const router = require("express").Router();
const User = require("../models").user;
const UserBuffer = require("../models").userBuffer;
const MatchHistory = require("../models").matchHistory;
const MatchNewest = require("../models").matchNewest;

router.use((req, res, next) => {
  console.log("正在接收一個跟 system 有關的請求");
  next();
});

//執行用戶配對
//存活的訂閱 -> 存活沒訂閱
router.post("/match", async (req, res) => {
  const RE_MATCH_DELAY = 48 * 60 * 60 * 1000;
  const time48HoursAgo = Date.now() - RE_MATCH_DELAY; // 計算48小時前的時間點

  try {
    let time = Date.now();

    //清空最近的配對列表
    await MatchNewest.deleteMany({});

    //儲存配對次數已用完的用戶
    let consumeUsers = new Set();

    //先處理有存活
    const aliveUsers = await User.find({
      isAlive: true,
    });

    // //執行有存活的訂閱用戶(訂閱用戶可以配對三個存活用戶/非訂閱只能一個)
    for (let i = 0; i < aliveUsers.length; i++) {
      const currentUser = aliveUsers[i];

      //如果這個用戶已經用完配對次數，就換下一個用戶執行
      if (consumeUsers.has(currentUser.userID)) {
        continue;
      }

      //查詢這個用戶最近48hr的配對紀錄
      const lastMatches = await MatchHistory.find({
        matchDate: { $gte: time48HoursAgo }, // 過去48小時到現在的配對
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });

      // 提取與 currentUser 最近48hr配對過的用戶ID
      const lastMatchedUserIds = lastMatches.map((match) =>
        match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
      );

      //檢查目前這個用戶還剩下多少配對次數,沒訂閱不用檢查,因為只有一次
      let targetUserCount = 0;

      if (currentUser.isSubscription) {
        //檢查訂閱用戶剩餘次數
        const matchs = await MatchNewest.find({
          $or: [
            { user1ID: currentUser.userID },
            { user2ID: currentUser.userID },
          ],
        });
        //剩下配對的次數
        targetUserCount = 3 - matchs.length;
      } else {
        targetUserCount = 1;
      }

      //合併排除的對象
      const consumeSetArray = Array.from(consumeUsers);
      const combinedArray = [...lastMatchedUserIds, ...consumeSetArray];

      // const targetUsers = await User.find({
      //   userID: {
      //     $ne: currentUser.userID,
      //     $nin: Array.from(combinedArray),
      //   }, // 排除自己和已匹配過與不合適的用戶
      //   isAlive: true,
      // }).limit(targetUserCount);

      //用戶篩選條件
      let {
        objectCondition: {
          objectGender,
          objectAge: { maxAge, minAge },
          objectRegion,
        },
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
            isAlive: true,
          },
        },
        {
          $addFields: {
            genderScore: {
              $cond: [{ $eq: ["$userGender", objectGender] }, 1, 0],
            },
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
            regionScore: {
              $cond: [{ $eq: ["$userRegion", objectRegion] }, 1, 0],
            },
          },
        },
        {
          $sort: {
            genderScore: -1, //性別匹配的加權分數，降序
            ageScore: -1, // 年齡匹配的加權分數，降序
            regionScore: -1, // 地區匹配的加權分數，降序
          },
        },
        { $limit: targetUserCount },
      ]);

      if (currentUser.isSubscription && targetUserCount == 3) {
        consumeUsers.add(currentUser.userID);
      }

      if (!currentUser.isSubscription && targetUserCount == 1) {
        consumeUsers.add(currentUser.userID);
      }

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
          sendbird: {
            url,
            isChecked: false,
          },
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

    return res.status(200).send({
      status: true,
      message: "已完成配對！",
      useTime: finishTime,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      error,
    });
  }
});

//獲取本日配對列表
router.get("/match-newest", async (req, res) => {
  try {
    const matchNewest = await MatchNewest.find()
      .populate("user1_ID", ["userName", "userID"])
      .populate("user2_ID", ["userName", "userID"]);

    return res.status(200).send({
      status: true,
      message: "成功獲取本日配對列表",
      data: matchNewest,
    });
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error",
      e,
    });
  }
});

//刪除本日配對列表
router.delete("/match-newest", async (req, res) => {
  try {
    await MatchNewest.deleteMany({});

    return res.status(200).send({
      status: true,
      message: "已刪除本日所有配對紀錄",
    });
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error",
      e,
    });
  }
});

//獲取歷史配對列表
router.get("/match-record", async (req, res) => {
  try {
    const matchHistories = await MatchHistory.find()
      .populate("user1_ID", ["userName", "userID"])
      .populate("user2_ID", ["userName", "userID"]);

    return res.status(200).send({
      status: true,
      message: "成功獲取歷史配對列表",
      data: matchHistories,
    });
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error",
      e,
    });
  }
});

//刪除所有歷史配對
router.delete("/match-record", async (req, res) => {
  try {
    await MatchHistory.deleteMany({});

    return res.status(200).send({
      status: true,
      message: "已刪除所有配對紀錄",
    });
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error",
      e,
    });
  }
});

//取得指定用戶的配對對象
router.post("/get-match", async (req, res) => {
  let { userID } = req.body;

  try {
    const result = await MatchNewest.find({
      $or: [{ user1ID: userID }, { user2ID: userID }],
    })
      .populate("user1_ID", ["userName", "userID", "userPhoto"])
      .populate("user2_ID", ["userName", "userID", "userPhoto"]);

    const data = [];

    result.forEach((match) => {
      data.push(match.user1ID === userID ? match.user2_ID : match.user1_ID);
    });

    if (data.length > 0) {
      return res.status(200).send({
        status: true,
        message: "成功獲取配對對象列表",
        data,
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "目前沒有對象",
        data: [],
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
    });
  }
});

//取得指定用戶的資料
router.get("/get-user", async (req, res) => {
  try {
    let { userID } = req.body;
    const data = await User.findOne({
      userID,
    });

    if (data) {
      return res.status(200).send({
        status: true,
        message: "成功找到用戶",
        data,
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "查無用戶",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

module.exports = router;

// const targetUsers = await User.aggregate([
//   {
//     $match: {
//       userID: {
//         $ne: currentUser.userID,
//         $nin: Array.from(combinedArray), // 排除不合適的用戶
//       },
//       isAlive: true,
//     },
//   },
//   {
//     $addFields: {
//       genderScore: { $cond: [{ $eq: ["$userGender", currentUser.userGender] }, 1, 0] },
//       ageScore: {
//         $cond: [
//           {
//             $and: [
//               { $gte: ["$userAge", currentUser.userAge - 2] },
//               { $lte: ["$userAge", currentUser.userAge + 2] },
//             ],
//           },
//           1,
//           0,
//         ],
//       },
//       regionScore: { $cond: [{ $eq: ["$userRegion", currentUser.userRegion] }, 1, 0] },
//     },
//   },
//   {
//     $sort: {
//       genderScore: -1, // 性別匹配的加權分數，降序
//       ageScore: -1,    // 年齡匹配的加權分數，降序
//       regionScore: -1, // 地區匹配的加權分數，降序
//     },
//   },
//   {
//     $limit: targetUserCount,
//   },
// ]);
