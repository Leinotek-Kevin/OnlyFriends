const router = require("express").Router();
const User = require("../models").user;
const jwt = require("jsonwebtoken");
const passport = require("passport");

router.use((req, res, next) => {
  console.log("正在接收一個跟 auth 有關的請求");
  next();
});

//A-1 帳號驗證登入
router.post("/login", async (req, res) => {
  let { userID, userEmail, userName, userPhoto } = req.body;

  // 定義電子郵件格式的正則表達式
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

  // 判斷這些值不能為 null、空字串，且必須是字串
  if (
    typeof userID !== "string" ||
    !userID ||
    typeof userEmail !== "string" ||
    !userEmail ||
    !emailRegex.test(userEmail) ||
    typeof userName !== "string" ||
    !userName ||
    typeof userPhoto !== "string" ||
    !userPhoto
  ) {
    return res.status(400).send({
      status: false,
      message: "無效的輸入資料",
    });
  }

  try {
    //開始製作 JWT
    const findUser = await User.findOne({ userEmail });

    if (findUser) {
      await User.updateOne({ userEmail }, { userID, isLogin: true });
      console.log("驗證登入" + "User 已更新");
    } else {
      await User.create({
        userID,
        userName,
        userEmail,
        userPhoto,
        isLogin: true,
      });
      console.log("驗證登入" + "User 已建立");
    }

    //製作 json web token
    const tokenObject = { userID, userEmail };
    const token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET);

    return res.status(200).send({
      status: true,
      message: "登入成功",
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

module.exports = router;
