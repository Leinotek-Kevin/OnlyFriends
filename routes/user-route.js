const router = require("express").Router();
const User = require("../models").user;
const MatchNeswest = require("../models").matchNewest;
const Config = require("../models").config;
const dateUtil = require("../utils/date-util");
const passport = require("passport");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

//先驗證 user 是不是存在，並獲取 user info
router.use((req, res, next) => {
  console.log("正在接收一個跟 user 有關的請求");
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "伺服器錯誤" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res.status(200).send({
        status: true,
        message: "JWT 驗證失敗！查無此用戶!",
        validCode: "0",
      });
    } else if (user.userValidCode == "2") {
      return res.status(200).send({
        status: true,
        message: "該用戶已被停權！",
        validCode: "2",
      });
    }

    // 驗證成功，將 user 資料放入 req.user
    req.user = user;
    next();
  })(req, res); // 注意這裡要馬上調用 authenticate 函數
});

//B-1 獲取使用者資訊
router.post("/info", async (req, res) => {
  try {
    let {
      action,
      userName,
      userPhotos,
      userRegion,
      userMBTI,
      userQuestion,
      emotion,
      interested,
      traits,
      friendStatus,
      loveExperience,
    } = req.body;

    let { userEmail, userID, registerTime, lastSendLetterTime } = req.user;

    let isTodayRegister = dateUtil.isToday(registerTime);
    let isTodayEverSend = dateUtil.isToday(lastSendLetterTime);

    //拷貝 req.user，確保 output 是一個獨立 object
    let data = {
      ...req.user._doc,
      isTodayRegister,
      isTodayEverSend,
    };

    //刪掉不要的字段
    delete data._id;
    delete data.__v;
    delete data.userActives;
    delete data.lastSendLetterTime;
    delete data.registerTime;
    delete data.lastLoginTime;
    delete data.userValidCode;

    let { updateDate } = req.user.userActives;

    let today = dateUtil.getToday();
    let isNotToday = updateDate !== today;

    if (isNotToday) {
      await User.updateOne(
        {
          userID: req.user.userID,
        },
        {
          "userActives.likeLetters": [],
          "userActives.unlockObjects": [],
          "userActives.updateDate": today,
        }
      );
    }

    //讀取或更改用戶資料
    if (action == 0) {
      return res.status(200).send({
        status: true,
        message: "成功讀取用戶資訊",
        validCode: "1",
        data,
      });
    }

    if (action == 1) {
      // 準備要更新的資料
      let updateData = {};

      //用戶可以改暱稱,頭貼,地區,感情狀態,興趣愛好,個人特質,交友動態,情場經歷, 提問
      // 如果有提供 userName，才將其加入更新資料中
      if (userName != null) {
        updateData.userName = userName;
      }

      if (userPhotos != null) {
        try {
          const photoArray = JSON.parse(userPhotos);
          updateData.userPhotos = photoArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      if (userRegion != null) {
        updateData.userRegion = userRegion;
      }

      if (userMBTI != null) {
        updateData.userRegion = userMBTI;
      }

      if (userQuestion != null) {
        updateData.userQuestion = userQuestion;
      }

      if (emotion != null) {
        updateData.userAttribute.emotion = emotion;
      }

      if (interested != null) {
        updateData.userAttribute.interested = interested;
      }

      if (traits != null) {
        updateData.userAttribute.traits = traits;
      }

      if (friendStatus != null) {
        updateData.userAttribute.friendStatus = friendStatus;
      }

      if (loveExperience != null) {
        updateData.userAttribute.loveExperience = loveExperience;
      }

      const data = await User.findOneAndUpdate(
        { userEmail, userID },
        { $set: updateData },
        {
          new: true,
          upsert: true,
        }
      );

      return res.status(200).send({
        status: true,
        message: "更新用戶資訊成功",
        validCode: "1",
        data,
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error!",
      validCode: "-1",
    });
  }
});

//B-2 獲取本日配對的對象資訊
router.post("/today-matches", async (req, res) => {
  try {
    let { userID, isSubscription } = req.user;
    let { unlockObjects } = req.user.userActives;

    const newestMatches = await MatchNeswest.find({
      $or: [{ user1ID: userID }, { user2ID: userID }],
    })
      .populate("user1_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "notificationStatus",
      ])
      .populate("user2_ID", [
        "userName",
        "userID",
        "userPhotos",
        "userQuestion",
        "notificationStatus",
      ])
      .sort({
        uiType: 1,
      });

    let { matchScheduleStatus } = await Config.findOne({});

    const matches = [];

    if (newestMatches.length > 0) {
      //OF 團隊聊天室
      let serviceData = {
        uiType: 0,
        sendbirdUrl: "onlyfriends_announcement_channel",
      };

      matches.push(serviceData);

      //整理要輸出給前端的配對資料
      newestMatches.forEach(async (match) => {
        let objectInfo =
          match.user1ID === userID ? match.user2_ID : match.user1_ID;

        let letterContent =
          match.user1ID === userID
            ? match.user2letterContent
            : match.user1letterContent;

        let outData = {
          uiType: match.matchUIType,
          userID: objectInfo.userID,
          userName: objectInfo.userName,
          userQuestion: objectInfo.userQuestion,
          userPhotos: objectInfo.userPhotos,
          notificationStatus: objectInfo.notificationStatus,
          sendbirdUrl: match.sendbirdUrl,
          isChecked: match.isChecked,
          isUnlock:
            isSubscription || unlockObjects.indexOf(objectInfo.userID) != -1,
          letterContent,
        };

        matches.push(outData);
      });

      return res.status(200).send({
        status: true,
        message: "成功獲取配對對象列表",
        validCode: "1",
        data: {
          matchScheduleStatus,
          matches,
        },
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "目前沒有對象",
        validCode: "1",
        data: {
          matchScheduleStatus,
          matches,
        },
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-3 檢查用戶聊天渠道
router.post("/check-channel", async (req, res) => {
  try {
    let { channelUrl } = req.body;

    const match = await MatchNeswest.findOne({
      sendbirdUrl: channelUrl,
    });

    let { chatCover } = await Config.findOne({});

    if (match != null && match.isChecked) {
      return res.status(200).send({
        status: true,
        message: "這個渠道已經檢查過嚕！",
        validCode: "1",
      });
    } else {
      //房間配對對象
      let [user1ID, user2ID] = channelUrl.split("_");

      // SendBird API URL
      const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels`;

      // API Token
      const apiToken = process.env.SENDBIRD_API_TOKEN;

      // Request Headers
      const headers = {
        "Content-Type": "application/json, charset=utf8",
        "Api-Token": apiToken,
      };

      // Request Body (JSON data)
      const data = {
        name: user1ID + "&" + user2ID + "的房間",
        channel_url: channelUrl,
        cover_url: chatCover,
        custom_type: "chat",
        is_distinct: true,
        user_ids: [user1ID, user2ID],
        operator_ids: [process.env.SENDBIRD_OPERATOR_ID],
      };

      axios
        .post(url, data, { headers })
        .then(async (response) => {
          if (response.status === 200) {
            await MatchNeswest.findOneAndUpdate(
              {
                sendbirdUrl: channelUrl,
              },
              {
                isChecked: true,
              }
            );

            return res.status(200).send({
              status: true,
              message: "渠道檢查完成",
              validCode: "1",
              data: {
                isChecked: true,
              },
            });
          } else {
            return res.status(200).send({
              status: true,
              message: "渠道檢查有問題",
              validCode: "1",
              data: {
                isChecked: false,
              },
            });
          }
        })
        .catch((e) => {
          console.log(e);
          return res.status(200).send({
            status: true,
            message: "渠道檢查有問題",
            validCode: "1",
            data: {
              isChecked: false,
            },
          });
        });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: true,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//B-4 更新配對的篩選條件
router.post("/update-condition", async (req, res) => {
  try {
    let { userID, userEmail, isSubscription } = req.user;
    let { gender, minAge, maxAge, region } = req.body;

    let updateData = {
      objectCondition: {
        objectGender: gender,
        objectAge: {
          maxAge,
          minAge,
        },
      },
    };

    if (isSubscription && region != null) {
      updateData.objectCondition.objectRegion = region;
    }

    await User.updateOne(
      { userID, userEmail },
      {
        $set: updateData,
      }
    );

    return res.status(200).send({
      status: true,
      message: "成功修改配對條件",
      validCode: "1",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
    });
  }
});

//B-5 標記已經解鎖的對象用戶
router.post("/sign-unlock", async (req, res) => {
  try {
    let { userID, userEmail } = req.user;
    let { unlockObjects } = req.user.userActives;
    let { objectID } = req.body;

    if (unlockObjects.indexOf(objectID) == -1) {
      unlockObjects.push(objectID);

      await User.updateOne(
        { userID, userEmail },
        {
          "userActives.unlockObjects": unlockObjects,
          "userActives.updateDate": dateUtil.getToday(),
        }
      );

      return res.status(200).send({
        status: true,
        message: "成功標記解鎖用戶！",
        validCode: "1",
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "這個對象已經被標記解鎖過嚕！",
        validCode: "1",
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      validCode: "-1",
      e,
    });
  }
});

//後端使用 SendBird 不開放前端
router.post("/delete-room", async (req, res) => {
  let { channelUrl } = req.body; //刪除的群組頻道 URL
  const apiToken = process.env.SENDBIRD_API_TOKEN;

  // API 請求 URL
  const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels/${channelUrl}`;

  // Request Headers
  const headers = {
    "Api-Token": apiToken,
  };

  try {
    const response = await axios.delete(url, { headers });
    return res.status(200).send({
      status: true,
      message: "刪除成功",
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      error,
    });
  }
});

module.exports = router;
