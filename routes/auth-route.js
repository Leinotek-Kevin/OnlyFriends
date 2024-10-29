const router = require("express").Router();
const User = require("../models").user;
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { types } = require("joi");

router.use((req, res, next) => {
  console.log("正在接收一個跟 auth 有關的請求");
  next();
});

//A-1 帳號驗證登入
//暱稱 年齡 性別 頭貼 email 必填
router.post("/login", async (req, res) => {
  let { userEmail, deviceToken } = req.body;
  let userID = "";

  try {
    const findUser = await User.findOne({ userEmail });

    if (findUser) {
      //如果有使用者
      userID = findUser.userID;
      await User.updateOne({ userEmail }, { deviceToken, isLogin: true });
    } else {
      //資料庫不存在使用者
      return res.status(200).send({
        status: true,
        message: "尚未註冊！使用者不存在！",
        data: {
          userValid: false,
        },
      });
    }

    //製作 json web token
    const tokenObject = { userID, userEmail };
    const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);

    return res.status(200).send({
      status: true,
      message: "登入成功",
      data: {
        userValid: true,
        token: "JWT " + token, //返回 JWT token
      },
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//註冊使用者
router.post("/register", async (req, res) => {
  let { userEmail } = req.body;

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
      let userID = uuid.replace(/\D/g, "").slice(0, 10);

      let { userName, userGender, userAge, userPhoto, deviceToken } = req.body;

      await User.create({
        userID,
        userName,
        userGender,
        userAge,
        userPhoto,
        userEmail,
        deviceToken,
        isLogin: true,
      });

      message = "註冊成功！";
    }

    //製作 json web token
    const tokenObject = { userID, userEmail };
    const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);

    return res.status(200).send({
      status: true,
      message,
      token: "JWT " + token, //返回 JWT token
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error",
      e,
    });
  }
});

//A-2 登出帳號 -> 確保有使用者
router.post("/logout", (req, res) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Server Error" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res
        .status(200)
        .json({ status: true, message: "登出失敗！查無此用戶" });
    }

    try {
      let { userEmail, isLogin } = user;

      if (isLogin) {
        const data = await User.updateOne({ userEmail }, { isLogin: false });
        return res.status(200).send({
          status: true,
          message: "登出成功！",
        });
      } else {
        return res.status(200).send({
          status: true,
          message: "登出早就登出！",
        });
      }
    } catch (e) {
      return res.status(500).send({
        status: false,
        message: "Server Error",
      });
    }
  })(req, res);
});

//A-3 刪除帳號 -> 確保有使用者
router.post("/delete", (req, res) => {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Server Error" });
    }

    if (!user) {
      // 這裡返回自定義訊息
      return res
        .status(200)
        .json({ status: true, message: "刪除失敗！找不到使用者！" });
    }

    try {
      let { userEmail, userID } = user;

      await User.deleteOne({ userEmail, userID });

      return res.status(200).send({
        status: true,
        message: "使用者帳號已刪除",
      });
    } catch (e) {
      return res.status(500).send({
        status: false,
        message: "Server Error",
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
module.exports = router;
