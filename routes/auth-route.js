const router = require("express").Router();
const User = require("../models").user;
const EmotionLetter = require("../models").letter;

const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const ageUtil = require("../utils/caluAge-util");
const zodiacUtil = require("../utils/caluZodiac-util");
const generalUtil = require("../utils/general-util");
const dateUtil = require("../utils/date-util");
const sendbirdUtil = require("../utils/sendbird-util");

const SendBird = require("sendbird");
const sb = new SendBird({ appId: process.env.SENDBIRD_APP_ID });

router.use((req, res, next) => {
  console.log("正在接收一個跟 auth 有關的請求");
  next();
});

//A-1 註冊使用者
router.post("/register", async (req, res) => {
  let {
    userEmail,
    userName,
    userGender,
    userBirthday,
    userPhotos,
    userRegion,
    userQuestion,
    deviceToken,
    identity,
    osType,
  } = req.body;

  let message = "";

  try {
    const findUser = await User.findOne({ userEmail });
    let userID = "";

    if (findUser) {
      userID = findUser.userID;
      message = "你已經註冊過了";
    } else {
      //如果使用者不存在
      const uuid = uuidv4(); // 生成 UUID v4
      // 移除非數字的字符，只保留數字，並取前 10 位
      userID = uuid.replace(/\D/g, "").slice(0, 10);

      //用戶年齡與星座解析
      const userAge = ageUtil(userBirthday);
      const userZodiac = zodiacUtil(userBirthday);

      // 連接並設置 Sendbird 用戶暱稱
      await connectAndSetNickname(userID, userName);

      // 準備要更新的資料
      let createData = {
        userEmail,
        userID,
        userName,
        userGender,
        userBirthday,
        userAge,
        userZodiac,
        userRegion,
        userQuestion,
        identity,
        registerTime: Date.now(),
        lastLoginTime: Date.now(),
        isLogin: true,
      };

      // 如果有提供 userPhoto，才將其加入更新資料中
      if (generalUtil.isNotNUllEmpty(userPhotos)) {
        try {
          const photoArray = JSON.parse(userPhotos);
          createData.userPhotos = photoArray;
        } catch (e) {
          console.log("JSON 解析失敗:", e);
        }
      }

      // 如果有提供 deviceToken，才將其加入更新資料中
      if (generalUtil.isNotNUllEmpty(deviceToken)) {
        createData.deviceToken = deviceToken;
      }

      // 如果有提供 osType，才將其加入更新資料中
      if (generalUtil.isNotNUllEmpty(osType)) {
        createData.osType = osType;
      }

      await User.create(createData);

      message = "註冊成功！";
    }

    //製作 json web token
    const tokenObject = { userID, userEmail };
    const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);

    return res.status(200).send({
      status: true,
      message,
      validCode: "1",
      token: "JWT " + token, //返回 JWT token
    });
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

//A-2 帳號驗證登入
//暱稱 年齡 性別 頭貼 email 必填
router.post("/login", async (req, res) => {
  let { userEmail, deviceToken, osType } = req.body;
  let userID = "";

  try {
    const findUser = await User.findOne({ userEmail });

    // 準備要更新的資料
    let updateData = {
      lastLoginTime: Date.now(),
      isLogin: true,
    };

    // 如果有提供 deviceToken，才將其加入更新資料中
    if (generalUtil.isNotNUllEmpty(deviceToken)) {
      updateData.deviceToken = deviceToken;
    }

    // 如果有提供 deviceToken，才將其加入更新資料中
    if (generalUtil.isNotNUllEmpty(osType)) {
      updateData.osType = osType;
    }

    if (findUser) {
      //如果有使用者
      userID = findUser.userID;

      if (findUser.userValidCode == "2") {
        return res.status(200).send({
          status: true,
          message: "該用戶已被停權！",
          validCode: "2",
        });
      }

      await User.updateOne({ userID }, { $set: updateData });
    } else {
      //資料庫不存在使用者
      return res.status(200).send({
        status: true,
        message: "尚未註冊！查無此用戶！",
        validCode: "0",
      });
    }

    //製作 json web token
    const tokenObject = { userID, userEmail };
    const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);

    return res.status(200).send({
      status: true,
      message: "登入成功",
      validCode: "1",
      token: "JWT " + token, //返回 JWT token,
    });
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

//A-3 登出帳號 -> 確保有使用者
router.post("/logout", (req, res) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Server Error" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res.status(200).json({
        status: true,
        message: "登出失敗！查無此用戶!",
        validCode: "0",
      });
    } else if (user.userValidCode == "2") {
      return res.status(200).send({
        status: true,
        message: "該用戶已被停權！",
        validCode: "2",
      });
    }

    try {
      let { userEmail, isLogin } = user;

      if (isLogin) {
        const data = await User.updateOne({ userEmail }, { isLogin: false });
        return res.status(200).send({
          status: true,
          message: "登出成功！",
          validCode: "1",
        });
      }
    } catch (e) {
      return res.status(500).send({
        status: false,
        message: "Server Error",
        validCode: "-1",
      });
    }
  })(req, res);
});

//A-4 刪除帳號 -> 確保有使用者
//先複製出原本的使用者 -> 更改複製人的 mail
router.post("/delete", (req, res) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Server Error" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res.status(200).json({
        status: true,
        message: "刪除失敗！查無此用戶!",
        validCode: "0",
      });
    } else if (user.userValidCode == "2") {
      return res.status(200).send({
        status: true,
        message: "該用戶已被停權！",
        validCode: "2",
      });
    }

    try {
      let { userID, userEmail } = user;

      //刪除該帳號今天發過的信封
      const todayNightTimeStamp = dateUtil.getTodayNight();
      await EmotionLetter.deleteMany({
        letterUserID: userID,
        createTime: { $gte: todayNightTimeStamp },
      });

      //刪掉 Sendbird User
      await sendbirdUtil.deleteUser(userID);

      //複製人email
      const copyMail =
        userEmail.split("@")[0] +
        ".copy" +
        Date.now() +
        "@" +
        userEmail.split("@")[1];

      //將舊帳號的 Email 改掉
      await User.updateOne(
        { userID },
        {
          userEmail: copyMail,
          userValidCode: "3",
        }
      );

      return res.status(200).send({
        status: true,
        message: "使用者帳號已標記刪除",
        validCode: "3",
      });
    } catch (e) {
      return res.status(500).send({
        status: false,
        message: "Server Error",
        validCode: "-1",
      });
    }
  })(req, res);
});

//強制刪除所有用戶帳號
router.post("/delete-all", async (req, res) => {
  try {
    await User.find({}).deleteMany();
    return res.status(200).send({
      status: true,
      message: "成功刪除全部用戶",
    });
  } catch (e) {
    return res.status(500).send({
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
