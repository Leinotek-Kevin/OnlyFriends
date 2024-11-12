const router = require("express").Router();
const User = require("../models").user;
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
    //清空最近的配對列表
    await MatchNewest.deleteMany({});

    //先處理有存活
    const aliveUsers = await User.find({
      isAlive: true,
    });

    // //執行有存活的訂閱用戶(訂閱用戶可以配對三個存活用戶/非訂閱只能一個)
    for (let i = 0; i < aliveUsers.length; i++) {
      const currentUser = aliveUsers[i];

      //檢查這個用戶是不是已經達到本日配對次數
      let time3 = Date.now();
      const matchs = await MatchNewest.find({
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });
      console.log(
        "檢查這個用戶是不是已經達到本日配對次數",
        (Date.now() - time3) / 1000
      );

      //可用的配對次數
      const allowMatches = currentUser.isSubscription ? 3 : 1;
      //剩下配對的次數
      let limitMatches = allowMatches - matchs.length;

      //如果已經用完了，就直接進行下一個
      if (limitMatches == 0) {
        continue;
      }

      //查詢這個用戶最近48hr的配對紀錄
      let time2 = Date.now();
      const lastMatches = await MatchHistory.find({
        matchDate: { $gte: time48HoursAgo }, // 過去48小時到現在的配對
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });
      console.log(
        "查詢這個用戶最近48hr的配對紀錄",
        (Date.now() - time2) / 1000
      );

      // 獲取與 currentUser 最近48hr配對過的用戶ID
      const lastMatchedUserIds = lastMatches.map((match) =>
        match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
      );

      let time1 = Date.now();
      const targetUsers = await User.find({
        userID: {
          $ne: currentUser.userID,
          $nin: Array.from(lastMatchedUserIds),
        }, // 排除自己和已匹配過的用戶
        isAlive: true,
      });
      console.log("排除自己和已匹配過的用戶", (Date.now() - time1) / 1000);

      const matches = [];

      //檢查準備要與這個用戶配對的對象的配對次數是不是ok
      let time = Date.now();
      for (let i = 0; i < targetUsers.length; i++) {
        if (limitMatches == 0) {
          break;
        }

        let targetUser = targetUsers[i];

        const matchPoints = await MatchNewest.find({
          $or: [{ user1ID: targetUser.userID }, { user2ID: targetUser.userID }],
        });

        //如果要配對的對象是有訂閱,且已經達到配對次數
        //如果配對對象是沒有訂閱,且已經達到配對次數
        //這兩個條件都排除
        if (targetUser.isSubscription) {
          if (matchPoints.length === 3) {
            continue;
          }
        } else {
          if (matchPoints.length === 1) {
            continue;
          }
        }

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

        matches.push(match);
        limitMatches--;
      }
      console.log(
        "檢查準備要與這個用戶配對的對象的配對次數是不是ok",
        (Date.now() - time) / 1000
      );

      await MatchNewest.insertMany(matches);
      await MatchHistory.insertMany(matches);
    }

    return res.status(200).send({
      status: true,
      message: "已完成配對！",
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

router.post("/match-opt", async (req, res) => {
  const RE_MATCH_DELAY = 48 * 60 * 60 * 1000; // 48小時
  const time48HoursAgo = Date.now() - RE_MATCH_DELAY; // 計算48小時前的時間點

  try {
    // 清空最近的配對列表
    await MatchNewest.deleteMany({});

    // 取得所有活躍的用戶
    const aliveUsers = await User.find({ isAlive: true });

    // 取得最近48小時的配對紀錄，將這個查詢提前做一次
    const recentMatches = await MatchHistory.find({
      matchDate: { $gte: time48HoursAgo },
    });

    // 建立一個物件來快速查找最近48小時內的配對紀錄
    const recentMatchMap = new Map();
    recentMatches.forEach((match) => {
      if (!recentMatchMap.has(match.user1ID)) {
        recentMatchMap.set(match.user1ID, new Set());
      }
      recentMatchMap.get(match.user1ID).add(match.user2ID);

      if (!recentMatchMap.has(match.user2ID)) {
        recentMatchMap.set(match.user2ID, new Set());
      }
      recentMatchMap.get(match.user2ID).add(match.user1ID);
    });

    // 並行處理每個用戶的配對
    const matchPromises = aliveUsers.map(async (currentUser) => {
      const currentUserID = currentUser.userID;

      // 檢查用戶的當前配對次數
      const matchs = await MatchNewest.find({
        $or: [{ user1ID: currentUserID }, { user2ID: currentUserID }],
      });

      // 訂閱用戶最多3個配對，非訂閱用戶最多1個
      const allowMatches = currentUser.isSubscription ? 3 : 1;
      let limitMatches = allowMatches - matchs.length;

      if (limitMatches === 0) return; // 如果已達到配對次數限制

      // 獲取與 currentUser 最近48小時內配對過的用戶
      const lastMatchedUserIds = recentMatchMap.get(currentUserID) || new Set();

      // 找到適合配對的用戶
      const targetUsers = await User.find({
        userID: {
          $ne: currentUserID, // 排除自己
          $nin: Array.from(lastMatchedUserIds), // 排除最近48小時內配對過的用戶
        },
        isAlive: true,
      });

      const matches = [];

      for (const targetUser of targetUsers) {
        if (limitMatches === 0) break; // 如果已達到配對次數限制

        const targetUserID = targetUser.userID;

        // 查詢目標用戶的當前配對次數
        const matchPoints = await MatchNewest.find({
          $or: [{ user1ID: targetUserID }, { user2ID: targetUserID }],
        });

        // 檢查目標用戶的配對次數是否達到限制
        if (targetUser.isSubscription && matchPoints.length === 3) {
          continue; // 訂閱用戶最多3個配對
        } else if (!targetUser.isSubscription && matchPoints.length === 1) {
          continue; // 非訂閱用戶最多1個配對
        }

        // 構建配對的 SendBird 房間 URL
        const url =
          Number(currentUserID) > Number(targetUserID)
            ? `${targetUserID}_${currentUserID}`
            : `${currentUserID}_${targetUserID}`;

        // 構建配對記錄
        const match = {
          user1ID: currentUserID,
          user2ID: targetUserID,
          user1_ID: currentUser._id,
          user2_ID: targetUser._id,
          sendbird: {
            url,
            isChecked: false,
          },
        };

        matches.push(match);
        limitMatches--;
      }

      // 寫入配對記錄到資料庫
      if (matches.length > 0) {
        await MatchNewest.insertMany(matches);
        await MatchHistory.insertMany(matches);
      }
    });

    // 使用 Promise.all 並行處理
    await Promise.all(matchPromises);

    return res.status(200).send({
      status: true,
      message: "已完成配對！",
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

module.exports = router;
