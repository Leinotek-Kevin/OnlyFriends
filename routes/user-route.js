const router = require("express").Router();
const User = require("../models").user;

router.use((req, res, next) => {
  console.log("正在接收一個跟 user 有關的請求");
  next();
});

/**
 * 獲取使用者資訊
 */
router.post("/info", async (req, res) => {
  const user = req.user;

  try {
    const data = await User.findOne({
      userID: user.userID,
      userEmail: user.userEmail,
    });

    if (data) {
      return res
        .status(200)
        .send({ status: true, message: "成功獲取使用資料", data });
    } else {
      return res
        .status(200)
        .send({ status: true, message: "找不到這個使用者", data: {} });
    }
  } catch (e) {
    return res
      .status(500)
      .send({ status: false, message: "Server Error!", data: {} });
  }
});

module.exports = router;
