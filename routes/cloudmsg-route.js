const router = require("express").Router();
const cloudmsg = require("../utils/cloudmsg-util");
const User = require("../models").user;

//針對單個設備推播測試
router.post("/device", async (req, res) => {
  let { userID } = req.body;

  const foundUser = await User.findOne({ userID });
  const { deviceTokens } = foundUser;

  if (deviceTokens) {
    const result = await cloudmsg.sendMsgToDevice(deviceTokens, req.body);

    return res
      .status(200)
      .send({ status: true, message: result ? "推播已經發送" : "發送失敗" });
  } else {
    return res.status(200).send({ status: true, message: "發送失敗" });
  }
});

//針對主題推播測試
router.post("/topic", async (req, res) => {
  let { topic } = req.body;
  const result = await cloudmsg.sendMsgToTopic(topic, req.body);

  return res
    .status(200)
    .send({ status: true, message: result ? "推播已經發送" : "發送失敗" });
});

module.exports = router;
