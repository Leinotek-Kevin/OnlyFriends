const router = require("express").Router();
const User = require("../models").user;
const jwt = require("jsonwebtoken");

router.use((req, res, next) => {
  console.log("正在接收一個跟 auth 有關的請求");
  next();
});

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
      //如果接收的 userID 和 資料庫的一樣，表示這是已存在的用戶，那就直接製作 JWT
      //如果不一樣，就更新 userID

      if (userID !== findUser.userID) {
        await User.updateOne({ userID: findUser.userID }, { userID });
        console.log("驗證登入" + "UserId 已更新");
      } else {
        console.log("驗證登入" + "UserId 已存在");
      }
    } else {
      await User.create({ userID, userName, userEmail, userPhoto });
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

module.exports = router;
