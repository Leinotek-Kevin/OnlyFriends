const router = require("express").Router();

const User = require("../models").user;
const EmotionLetter = require("../models").letter;
const Error = require("../models").error;

const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const ageUtil = require("../utils/caluAge-util");
const zodiacUtil = require("../utils/caluZodiac-util");
const generalUtil = require("../utils/general-util");
const dateUtil = require("../utils/date-util");
const sendbirdUtil = require("../utils/sendbird-util");
const cloudStorage = require("../utils/cloudStorage-util");

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
    userMBTI,
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
        deviceTokens: [],
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
        createData.deviceTokens.push(deviceToken);
      }

      // 如果有提供 osType，才將其加入更新資料中
      if (generalUtil.isNotNUllEmpty(osType)) {
        createData.osType = osType;
      }

      if (generalUtil.isNotNUllEmpty(userMBTI)) {
        createData.userMBTI = userMBTI;
      }

      // 連接並設置 Sendbird 用戶ID,暱稱,大頭貼
      const tmpPhotos = createData.userPhotos;
      const userPhoto =
        Array.isArray(tmpPhotos) && tmpPhotos.length > 0 ? tmpPhotos[0] : "";

      await sendbirdUtil.createAndUpdateUser(userID, userName, userPhoto);

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

    if (findUser) {
      if (findUser.userValidCode == "2") {
        return res.status(200).send({
          status: true,
          message: "該用戶已被停權！",
          validCode: "2",
        });
      }

      //用戶 ID
      userID = findUser.userID;

      // 如果有提供 deviceToken，才將其加入更新資料中
      if (generalUtil.isNotNUllEmpty(deviceToken)) {
        let currentTokens = findUser.deviceTokens;

        if (!currentTokens.includes(deviceToken)) {
          currentTokens.push(deviceToken);
        }
        updateData.deviceTokens = currentTokens;
      }

      // 如果有提供 osType，才將其加入更新資料中
      if (generalUtil.isNotNUllEmpty(osType)) {
        updateData.osType = osType;
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
      lastLoginTime: updateData.lastLoginTime,
    });
  } catch (e) {
    const errorRequest = userEmail + "-" + deviceToken + "-" + osType;
    const errorMessage = e.message;

    await Error.create({
      errorRequest: errorRequest,
      errorMessage: e.message,
    });

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
      let { userID, deviceTokens } = user;
      let { osType, fcmToken, apnsToken } = req.body;

      //移除這個帳號在 sendbird 綁定的裝置 token
      const targetDeviceToken = osType == "1" ? apnsToken : fcmToken;
      await sendbirdUtil.removeRegisterToken(osType, userID, targetDeviceToken);

      //OF 資料庫解除這個帳號的 fcmToken 綁定
      //用戶有一個以上的 token
      if (deviceTokens) {
        deviceTokens = deviceTokens.filter((token) => token !== fcmToken);
      }

      await User.updateOne({ userID }, { isLogin: false, deviceTokens });

      return res.status(200).send({
        status: true,
        message: "登出成功！",
        validCode: "1",
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
      let { userID, userEmail, userPhotos } = user;

      //刪除該帳號今天發過的信封
      const todayNightTimeStamp = dateUtil.getTodayNight();
      await EmotionLetter.deleteMany({
        letterUserID: userID,
        createTime: { $gte: todayNightTimeStamp },
      });

      //刪掉 Sendbird User
      await sendbirdUtil.deleteUser(userID);

      //刪除用戶所有大頭貼
      if (userPhotos && userPhotos.length > 0) {
        await cloudStorage.deleteImages(userPhotos);
      }

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
          deviceTokens: [],
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

//A-5 回報指定用戶的上線登入時間
router.post("/record-login", (req, res) => {
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
      let { userID } = user;

      await User.updateOne({ userID }, { lastLoginTime: Date.now() });

      return res.status(200).send({
        status: true,
        message: "最近上線登入紀錄成功",
        lastLoginTime: Date.now(),
        validCode: "1",
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

//A-6 官方人員驗證登入
router.post("/official-login", async (req, res) => {
  let { userEmail } = req.body;

  try {
    const findUser = await User.findOne({ userEmail });

    if (findUser) {
      //如果有使用者
      let { identity } = findUser;

      if (identity == 1) {
        //官方人員
        //製作 json web token
        const tokenObject = { userID: findUser.userID, userEmail };
        const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);

        return res.status(200).send({
          status: true,
          message: "登入成功",
          validCode: "1",
          token: "JWT " + token, //返回 JWT token,
        });
      } else {
        //資料庫不存在使用者
        return res.status(200).send({
          status: true,
          message: "很抱歉！本系統僅限官方人員使用！",
          validCode: "0",
        });
      }
    } else {
      //資料庫不存在使用者
      return res.status(200).send({
        status: true,
        message: "尚未註冊！查無此用戶！",
        validCode: "0",
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

module.exports = router;
