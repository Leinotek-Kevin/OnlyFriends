const router = require("express").Router();
const User = require("../models").user;
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
      return res
        .status(200)
        .send({ status: true, message: "JWT 驗證失敗！查無此用戶" });
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
      userPhoto,
      userRegion,
      userMBTI,
      emotion,
      interested,
      traits,
      friendStatus,
      loveExperience,
    } = req.body;
    let { userEmail, userID } = req.user;

    if (action == 0) {
      return res.status(200).send({
        status: true,
        message: "成功讀取用戶資訊",
        data: req.user,
      });
    }

    if (action == 1) {
      // 準備要更新的資料
      let updateData = {};

      //用戶可以改暱稱,頭貼,地區,感情狀態,興趣愛好,個人特質,交友動態,情場經歷
      // 如果有提供 userName，才將其加入更新資料中
      if (userName != null) {
        updateData.userName = userName;
      }

      if (userPhoto != null) {
        updateData.userPhoto = userPhoto;
      }

      if (userRegion != null) {
        updateData.userRegion = userRegion;
      }

      if (userMBTI != null) {
        updateData.userRegion = userMBTI;
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
        data,
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: true,
      message: "Server Error!",
    });
  }
});

//B-2 獲取本日配對的對象資訊
router.post("/today-match", async (req, res) => {
  try {
    let { userID } = req.user;
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//B-3 加入與配對對象的聊天室
router.post("/join-room", async (req, res) => {
  try {
    let { userID } = req.user;
    let { objectUserID } = req.body;

    const objectUser = await User.findOne({ userID: objectUserID });

    // SendBird API URL
    const url = `https://api-${process.env.SENDBIRD_APP_ID}.sendbird.com/v3/group_channels`;

    // API Token
    const apiToken = process.env.SENDBIRD_API_TOKEN;

    // Request Headers
    const headers = {
      "Content-Type": "application/json, charset=utf8",
      "Api-Token": apiToken,
    };

    const channel_url =
      userID > objectUserID
        ? `${objectUserID}_${userID}`
        : `${userID}_${objectUserID}`;

    // Request Body (JSON data)
    const data = {
      name: `${req.user.userName}&${objectUser.userName}的房間`,
      channel_url,
      cover_url: "https://sendbird.com/main/img/cover/cover_08.jpg",
      custom_type: "chat",
      is_distinct: true,
      user_ids: [req.user.userID, req.body.userID],
      operator_ids: ["7884269005"],
    };

    const response = await axios.post(url, data, { headers });

    return res.status(200).send({
      status: true,
      message: "房間建立成功",
      data: response.data.channel,
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
