const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const User = require("../models").user;
const UserRelation = require("../models").userRelation;
const Config = require("../models").config;
const MatchHistory = require("../models").matchHistory;
const MatchNewest = require("../models").matchNewest;
const EmotionLetter = require("../models").letter;
const Report = require("../models").report;

const dateUtil = require("../utils/date-util");
const storageUtil = require("../utils/cloudStorage-util");

const SendBird = require("sendbird");
const sb = new SendBird({ appId: process.env.SENDBIRD_APP_ID });

router.use((req, res, next) => {
  console.log("正在接收一個跟 system 有關的請求");
  next();
});

//顯示指定數量的身份用戶
router.post("/show-users", async (req, res) => {
  try {
    let { count, identity } = req.body;
    let data;

    if (count == -1) {
      data = await User.find({ identity });
    } else {
      data = await User.find({ identity }).limit(count);
    }

    return res.status(200).send({
      status: true,
      message: "成功獲取用戶列表",
      data,
      count: data.length,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//執行用戶一般配對
//存活的訂閱 -> 存活沒訂閱
router.post("/match-general", async (req, res) => {
  const RE_MATCH_DELAY = 48 * 60 * 60 * 1000;
  const time48HoursAgo = Date.now() - RE_MATCH_DELAY; // 計算48小時前的時間點
  const lastNightTimeStamp = dateUtil.getYesterdayNight();

  try {
    let time = Date.now();

    //當今天的一般配對執行完畢，才可以執行樹洞配對
    let {
      matchRecord: {
        general: { currentDate: generalDate, status: generalStatus },
      },
    } = await Config.findOne({});

    if (generalDate == dateUtil.getToday()) {
      if (generalStatus == "2" || generalStatus == "1") {
        return res.status(200).send({
          status: true,
          message: "正在執行配對或今天已經執行過！",
        });
      }
    }

    //標記正在配對的狀態
    await Config.updateOne({ "matchRecord.general.status": "1" });

    //清空最近的配對列表
    await MatchNewest.deleteMany({});

    //刪除大於過去兩天的歷史配對紀錄
    await MatchHistory.deleteMany({
      matchDate: { $lt: time48HoursAgo },
    });

    //儲存本次配對次數已用完的用戶
    let consumeUsers = new Set();

    //只有存活的用戶可以配對:昨天有上線的用戶即可
    const aliveUsers = await User.find({
      lastLoginTime: { $gte: lastNightTimeStamp },
      identity: 2,
    });

    //執行有存活的訂閱用戶(訂閱用戶可以配對三個存活用戶/非訂閱只能一個)
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

      //這個用戶封鎖的對象
      let relation = await UserRelation.findOne({
        userID: currentUser.userID,
      });
      const unlikeObjects = relation == null ? [] : relation.unlikeUsers;

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
            identity: -1, //依照用戶識別->降序 2:真人 ,1：官方, 0：假人
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
          sendbirdUrl: url,
          isChecked: false,
          matchUIType: 1,
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

//執行用戶樹洞配對
router.post("/match-letter", async (req, res) => {
  try {
    let time = Date.now();

    //當今天的一般配對執行完畢，才可以執行樹洞配對
    let {
      matchRecord: {
        general: { currentDate: generalDate, status: generalStatus },
        letter: { currentDate: letterDate, status: letterStatus },
      },
    } = await Config.findOne({});

    if (generalDate != dateUtil.getToday() || generalStatus != "2") {
      return res.status(200).send({
        status: true,
        message: "今天的一般配對還沒完成！不可以執行樹洞配對",
      });
    }

    if (letterDate == dateUtil.getToday()) {
      if (letterStatus == "2" || letterStatus == "1") {
        return res.status(200).send({
          status: true,
          message: "正在執行樹洞配對或今天已經執行過！",
        });
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

    return res.status(200).send({
      status: true,
      message: "心情樹洞配對已完成",
      useTime: finishTime,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//獲取本日配對列表
router.get("/match-newest", async (req, res) => {
  try {
    const matchNewest = await MatchNewest.find()
      .populate("user1_ID", ["userName", "userID", "identity"])
      .populate("user2_ID", ["userName", "userID", "identity"]);

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
      .populate("user1_ID", ["userName", "userID", "userPhotos"])
      .populate("user2_ID", ["userName", "userID", "userPhotos"]);

    const data = [];

    result.forEach((match) => {
      let userInfo = match.user1ID === userID ? match.user2_ID : match.user1_ID;

      let matchInfo = {
        userID: userInfo.userID,
        userName: userInfo.userName,
        userPhotos: userInfo.userPhotos,
        uiType: match.matchUIType,
      };

      data.push(matchInfo);
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

//獲取今天的樹洞配對列表
router.post("/get-letter-match", async (req, res) => {
  try {
    const data = await MatchNewest.find({
      matchUIType: 2,
    });

    res.status(200).send({
      status: true,
      message: "這是今天的樹洞配對列表",
      data,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
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
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//強制激活被判定是非活躍的用戶
router.post("/force-alive", async (req, res) => {
  try {
    const lastNightTimeStamp = dateUtil.getYesterdayNight();

    // 更新這些用戶的 lastLoginTime
    await User.updateMany(
      {
        lastLoginTime: { $lt: lastNightTimeStamp },
      },
      {
        $set: { lastLoginTime: lastNightTimeStamp + 1 * 60 * 60 * 1000 },
      }
    );

    res.status(200).send({
      status: true,
      message: "激活完畢",
    });
  } catch (e) {
    res.status(500).send({
      status: false,
      message: "Server Error",
    });
  }
});

//檢查配對列表是不是正常
router.post("/check-match", async (req, res) => {
  try {
    const users = await User.find({ identity: 2 });

    let errorUsers = [];
    let lostUsers = [];

    for (let i = 0; i < users.length; i++) {
      let currentUser = users[i];

      const matchs = await MatchNewest.find({
        $or: [{ user1ID: currentUser.userID }, { user2ID: currentUser.userID }],
      });

      let correct =
        (currentUser.isSubscription && matchs.length <= 3) ||
        (!currentUser.isSubscription && matchs.length <= 1);

      let hasLost =
        (currentUser.isSubscription && matchs.length < 3) ||
        (!currentUser.isSubscription && matchs.length < 1);

      if (hasLost) {
        lostUsers.push(currentUser.userID);
      }

      if (!correct) {
        errorUsers.push(currentUser.userID);
      }
    }

    if (errorUsers.length > 0) {
      res.status(200).send({
        status: true,
        message: "檢查完畢！有異常",
        data: errorUsers,
      });
    } else {
      if (lostUsers.length > 0) {
        res.status(200).send({
          status: true,
          message: "檢查完畢!有人沒配對！",
          data: lostUsers,
        });
      } else {
        res.status(200).send({
          status: true,
          message: "檢查完畢!無異常！",
        });
      }
    }
  } catch (e) {
    res.status(500).send({
      status: false,
      message: "Server Error",
    });
  }
});

//刪除指定時間之前樹洞信封列表
// router.post("/delete-letters", async (req, res) => {
//   try {
//     let { flagTime } = req.body;

//     const result = await EmotionLetter.deleteMany({
//       createTime: { $lt: flagTime },
//     });

//     let everDelete = result.deletedCount > 0;

//     return res.status(200).send({
//       status: true,
//       message: everDelete ? "刪除成功" : "沒有資料可以刪除",
//     });
//   } catch (e) {
//     console.log(e);
//     return res.status(500).send({ status: false, message: "Server Error", e });
//   }
// });

//更新系統配置
router.post("/config", async (req, res) => {
  try {
    let { chatCover } = req.body;

    let updateData = {};

    if (chatCover != null) {
      updateData.chatCover = chatCover;
    }

    await Config.findOneAndUpdate(
      {},
      {
        $set: updateData,
      },
      {
        upsert: true,
      }
    );

    return res.status(200).send({
      status: true,
      message: "系統配置更新成功！",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//清除所有心情樹洞信封
router.post("/delete-letters", async (req, res) => {
  try {
    await EmotionLetter.deleteMany();
    return res.status(200).send({
      status: true,
      message: "刪除成功",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//幫系統真人寫信
router.post("/robot-send", async (req, res) => {
  const robotUsers = await User.find({
    $or: [{ identity: 2 }],
  });
  let letters = [];

  for (let i = 0; i < robotUsers.length; i++) {
    let robotUser = robotUsers[i];

    let { _id, userID } = robotUser;

    let letterData = {
      letterUser: _id,
      letterUserID: userID,
      createTime: dateUtil.getYesterdayNight() + 1000 * 60 * 60,
    };

    const uuid = uuidv4(); // 生成 UUID v4
    // 移除非數字的字符，只保留數字，並取前 12 位
    let letterID = uuid.replace(/\D/g, "").slice(0, 12);

    letterData.letterContent =
      "大家好！我是：" + robotUser.userName + "好想認識大家喔！";
    letterData.letterID = letterID;

    letters.push(letterData);
  }

  EmotionLetter.insertMany(letters);

  return res.status(200).send({
    status: true,
    message: "模擬真人們紙飛機發送成功！",
  });
});

//顯示所有檢舉內容
router.get("/show-reports", async (req, res) => {
  try {
    const loadCount = 10;

    let { page } = req.body;
    // 從請求中獲取 page ,並設置默認值
    const queryPage = parseInt(page) || 1;
    // 計算應該跳過的數據量 (用於分頁)
    const skip = (queryPage - 1) * loadCount;

    let reports = await Report.find({})
      .sort({ reportDate: -1 })
      .skip(skip)
      .limit(loadCount);

    return res.status(200).send({
      status: true,
      message: "顯示所有檢舉內容",
      data: reports,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server error!",
      e,
    });
  }
});

//查詢＆審核檢舉內容
router.post("/review-report", async (req, res) => {
  try {
    let { reportID, action } = req.body;
    let report = await Report.findOne({ reportID });

    if (action == "0") {
      return res.status(200).send({
        status: true,
        message: "顯示指定檢舉案件內容",
        data: report,
      });
    } else {
      await Report.deleteOne({ reportID });

      //需要被 Ben 的標準

      //刪除 storage 照片
      const photos = report.photos;
      if (photos && photos.length > 0) {
        storageUtil.deleteImages(photos);
      }

      return res.status(200).send({
        status: true,
        message: "已完成審核",
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server error!",
      e,
    });
  }
});

//對 Sendbird OpenChannel 發送訊息
// router.post("/")

//建立 SendBird 用戶
router.post("/create-user", async (req, res) => {
  try {
    const users = await User.find({});

    for (let i = 0; i < users.length; i++) {
      let { userID, userName } = users[i];
      await connectAndSetNickname(userID, userName);
    }

    res.status(200).send({
      status: true,
      message: "建構用戶完成",
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//ConnectUser And userName
const connectAndSetNickname = async (userID, userName) => {
  return new Promise((resolve, reject) => {
    // 先連接 SendBird，用戶不存在則創建
    sb.connect(userID, function (user, error) {
      if (error) {
        return reject(error);
      }

      // 連接成功後，立即更新暱稱
      sb.updateCurrentUserInfo(userName, null, function (response, error) {
        if (error) {
          return reject(error);
        }
        resolve(response); // 暱稱更新成功
      });
    });
  });
};

module.exports = router;
