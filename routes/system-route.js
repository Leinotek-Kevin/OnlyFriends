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
      const matchs = await MatchNewest.find({
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });

      //可用的配對次數
      const allowMatches = currentUser.isSubscription ? 3 : 1;
      //剩下配對的次數
      let limitMatches = allowMatches - matchs.length;

      //如果已經用完了，就直接進行下一個
      if (limitMatches == 0) {
        continue;
      }

      //查詢這個用戶最近48hr的配對紀錄
      const lastMatches = await MatchHistory.find({
        matchDate: { $gte: time48HoursAgo }, // 過去48小時到現在的配對
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });

      // 獲取與 currentUser 最近48hr配對過的用戶ID
      const lastMatchedUserIds = lastMatches.map((match) =>
        match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
      );

      const targetUsers = await User.find({
        userID: {
          $ne: currentUser.userID,
          $nin: Array.from(lastMatchedUserIds),
        }, // 排除自己和已匹配過的用戶
        isAlive: true,
      });

      const matches = [];

      //檢查準備要與這個用戶配對的對象的配對次數是不是ok
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

module.exports = router;
