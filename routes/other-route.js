const router = require("express").Router();
const User = require("../models").user;

router.post("/query-user", async (req, res) => {
  try {
    let { userID } = req.body;

    const data = await User.findOne({
      userID,
    });

    if (data) {
      return res.status(200).send({
        status: true,
        message: "成功獲取使用者資訊",
        data,
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "查無此用戶！",
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

module.exports = router;
