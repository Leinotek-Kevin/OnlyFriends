const router = require("express").Router();
const User = require("../models").user;
const passport = require("passport");

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
  return res
    .status(200)
    .send({ status: true, message: "用戶驗證成功", data: req.user });
});

module.exports = router;
