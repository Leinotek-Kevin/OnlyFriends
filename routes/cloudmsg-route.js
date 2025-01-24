const router = require("express").Router();
const cloudmsg = require("../utils/cloudmsg-util");
const User = require("../models").user;

//針對指定用戶設備推播測試
router.post("/device", async (req, res) => {
  let { userID } = req.body;

  const foundUser = await User.findOne({ userID });
  const { deviceTokens, osType } = foundUser;

  if (deviceTokens) {
    let result;

    if (osType == "0") {
      //Android 設備
      result = await cloudmsg.sendMsgToAndroidDevice(deviceTokens, req.body);
    } else {
      //iOS 設備
      result = await cloudmsg.sendMsgToIOSDevice(deviceTokens, req.body);
    }

    return res
      .status(200)
      .send({ status: true, message: result ? "推播已經發送" : "發送失敗" });
  } else {
    return res.status(200).send({ status: true, message: "發送失敗" });
  }
});

//針對主題推播測試
router.post("/topic", async (req, res) => {
  let { topic, osType } = req.body;

  const isAndroidUser = osType == "0";
  let result;

  if (isAndroidUser) {
    result = await cloudmsg.sendMsgToAndroidTopic(topic, req.body);
  } else {
    result = await cloudmsg.sendMsgToIOSTopic(topic, req.body);
  }

  return res.status(200).send({
    status: true,
    message: result ? "推播已經發送" : "發送失敗",
  });
});

module.exports = router;
