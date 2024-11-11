const router = require("express").Router();
const User = require("../models").user;
const MatchHistory = require("../models").matchHistory;
const MatchNewest = require("../models").matchNewest;

router.use((req, res, next) => {
  console.log("正在接收一個跟 system 有關的請求");
  next();
});

//執行用戶配對
router.post("/match-last", async (req, res) => {
  const pairedUsers = new Set(); // 用來標記當天已經配對的用戶
  const RE_MATCH_DELAY = 24 * 60 * 60 * 1000;

  try {
    const users = await User.find();
    //根據用戶數量動態設置最大嘗試配對次數,至少是用戶總數的 1/5~1/2
    const MAX_ATTEMPTS = users.length;

    for (let i = 0; i < users.length; i++) {
      const user1 = users[i];

      if (pairedUsers.has(user1.userID)) continue; // 跳過已經配對的用戶

      // 查詢最近的配對記錄
      const pastMatches = await MatchHistory.find({
        $or: [{ user1ID: user1.userID }, { user2ID: user1.userID }],
        match_date: { $gte: new Date(Date.now() - RE_MATCH_DELAY) }, // 過去24小時的配對
      });

      // 獲取與 user1 最近配對過的用戶ID
      const pastMatchedUserIds = pastMatches.map((match) =>
        match.user1ID === user1.userID ? match.user2ID : match.user1ID
      );

      let user2 = null;
      let attempts = 0;

      // 隨機嘗試找到一個合適的配對對象
      while (attempts < MAX_ATTEMPTS) {
        const randomIndex = Math.floor(Math.random() * users.length);
        user2 = users[randomIndex];

        // 檢查 user2 是否已配對過，且不是自己，並且不在最近的配對列表中
        if (
          !pairedUsers.has(user2.userID) &&
          user1.userID !== user2.userID &&
          !pastMatchedUserIds.includes(user2.userID)
        ) {
          break; // 找到合適的配對對象
        }
        attempts++;
      }

      if (attempts >= MAX_ATTEMPTS) {
        console.log(`Unable to find a match for ${user1.name}`);
        continue;
      }

      if (user2) {
        // 嘗試更新現有的配對，若不存在則創建新的配對
        const matchRecord = await MatchHistory.findOneAndUpdate(
          {
            $or: [
              { user1ID: user1.userID, user2ID: user2.userID },
              { user1ID: user2.userID, user2ID: user1.userID },
            ],
          },
          {
            match_date: new Date(),
            user1ID: user1.userID, // 確保存儲 user1ID
            user2ID: user2.userID, // 確保存儲 user2ID
            user1_ID: user1._id, // 確保存儲 user1_ID
            user2_ID: user2._id, // 確保存儲 user2_ID
          },
          { new: true, upsert: true } // upsert 為 true 表示如果沒有找到則創建新記錄
        );

        console.log(
          `Paired: ${user1.name} with ${user2.name} - Match Record: ${matchRecord._id}`
        );

        // 標記這兩個用戶已配對，避免再次被選中
        pairedUsers.add(user1.userID);
        pairedUsers.add(user2.userID);
      }
    }

    return res.status(200).send({
      status: true,
      message: "配對已完成",
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      error,
    });
  }
});

//執行用戶配對
//存活的訂閱 -> 存活沒訂閱
router.post("/match", async (req, res) => {
  const RE_MATCH_DELAY = 48 * 60 * 60 * 1000;

  try {
    //清空最近的配對列表
    await MatchNewest.deleteMany({});

    //過去48小時的配對
    const recentMatches = await MatchHistory.find({
      matchDate: { $gte: Date.now() - RE_MATCH_DELAY }, // 過去48小時的配對
    });

    //目前本日配對列表
    const todayMatches = [];

    //先處理有存活的訂閱用戶
    const aliveSubUsers = await User.find({
      isSubscription: true,
      isAlive: true,
    });

    // //執行有存活的訂閱用戶(訂閱用戶可以配對三個存活用戶)
    for (let i = 0; i < aliveSubUsers.length; i++) {
      const currentUser = aliveSubUsers[i];

      todayMatches.find(currentUser);

      //檢查這個用戶是不是已經達到本日配對次數
      const matchs = await MatchNewest.find({
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });

      //剩下配對的次數
      let limitMatches = 3 - matchs.length;
      //如果已經用完了，就直接進行下一個
      if (limitMatches == 0) {
        continue;
      }

      // //查詢這個用戶最近48hr的配對紀錄
      // const lastMatches = await MatchHistory.find({
      //   matchDate: { $gte: Date.now() - RE_MATCH_DELAY }, // 過去48小時的配對
      //   $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      // });

      // 獲取與 currentUser 最近48hr配對過的用戶ID
      // const lastMatchedUserIds = lastMatches.map((match) =>
      //   match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
      // );

      //存入內存,獲取與 currentUser 最近48hr配對過的用戶ID
      const lastMatchedUserIds = new Set(
        recentMatches.map((match) =>
          match.user1ID === currentUser.userID ? match.user2ID : match.user1ID
        )
      );

      const targetUsers = await User.find({
        userID: {
          $ne: currentUser.userID,
          $nin: Array.from(lastMatchedUserIds),
        }, // 排除自己和已匹配過的用戶
        isAlive: true,
      });

      const matches = [];

      //如果有訂閱可以三次, 沒有訂閱只能一次
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

        let match = {
          user1ID: currentUser.userID, // 確保存儲 user1ID
          user2ID: targetUser.userID, // 確保存儲 user2ID
          user1_ID: currentUser._id, // 確保存儲 user1_ID
          user2_ID: targetUser._id, // 確保存儲 user2_ID
        };

        matches.push(match);
        limitMatches--;
      }

      // await MatchNewest.insertMany(matches);
      // await MatchHistory.insertMany(matches);
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
