const router = require("express").Router();
const sbUtil = require("../utils/sendbird-util");
const SendBird = require("sendbird");
const sb = new SendBird({ appId: process.env.SENDBIRD_APP_ID });
const User = require("../models").user;
const Bottleneck = require("bottleneck");

//先驗證 user 是不是存在，並獲取 user info
router.use((req, res, next) => {
  console.log("正在接收一個跟 sendbird 有關的請求");
  next();
});

//測試SB渠道是否存在
router.post("/channel-exist", async (req, res) => {
  try {
    let { channelName } = req.body;
    const isExist = await sbUtil.isGroupChannelExist(channelName);

    return res.status(200).send({
      status: true,
      message: isExist ? "該渠道存在" : "渠道不存在",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

//測試SB渠道刪除
router.post("/channel-delete", async (req, res) => {
  try {
    let { channelName } = req.body;
    const result = await sbUtil.deleteGroupChannel(channelName);

    return res.status(200).send({
      status: true,
      message: result ? "刪除成功" : "刪除失敗",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

//測試SB渠道建立
router.post("/channel-create", async (req, res) => {
  try {
    let { channelName } = req.body;
    const result = await sbUtil.createGroupChannel(channelName);

    return res.status(200).send({
      status: true,
      message: result ? "建立成功" : "建立失敗",
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

//測試SB渠道查詢
router.post("/channel-query", async (req, res) => {
  try {
    let { channelName } = req.body;
    const result = await sbUtil.queryGroupChannel(channelName);

    return res.status(200).send({
      status: true,
      message: result ? "渠道存在" : "渠道不存在",
      data: result,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

//測試SB渠道更新
router.post("/channel-update", async (req, res) => {
  try {
    let { channelName, cover } = req.body;
    const result = await sbUtil.updateGroupChannel(channelName, cover);

    return res.status(200).send({
      status: true,
      message: result ? "渠道更新成功" : "渠道更新不成功",
      data: result,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
    });
  }
});

//測試SB刪除使用者
router.post("/delete-user", async (req, res) => {
  try {
    let { userID } = req.body;

    const result = await sbUtil.deleteUser(userID);

    return res.status(200).send({
      status: true,
      message: result ? "成功刪除用戶" : "刪除用戶失敗",
      data: result,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//測試SB發送群組渠道訊息
router.post("/send-gmsg", async (req, res) => {
  try {
    let { userID, sendbirdUrl, msg } = req.body;

    const result = await sbUtil.sendMsgGroupChannel(sendbirdUrl, userID, msg);

    return res.status(200).send({
      status: true,
      message: result ? "成功發送訊息" : "發送訊息失敗",
      data: result,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//測試SB查詢群組渠道訊息
router.post("/show-gmsg", async (req, res) => {
  try {
    let { sendbirdUrl } = req.body;

    const data = await sbUtil.lastMsgGroupChannel(sendbirdUrl);
    const output = [];

    data.forEach((msg) => {
      output.push({
        messageID: msg.message_id,
        message: msg.message,
        senderID: msg.user.user_id,
        senderName: msg.user.nickname,
      });
    });

    return res.status(200).send({
      status: true,
      message: "查詢指定渠道訊息",
      data,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//建立 SendBird 用戶
router.post("/create-users", async (req, res) => {
  try {
    const users = await User.find({});

    for (let i = 0; i < users.length; i++) {
      let { userID, userName } = users[i];
      await connectAndSetNickname(userID, userName);
    }

    res.status(200).send({
      status: true,
      message: "建構用戶完成",
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
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

//測試SB發送公開渠道訊息
router.post("/send-omsg", async (req, res) => {
  try {
    let { msg, link, image, customType } = req.body;

    const result = await sbUtil.sendMsgOpenChannel(
      msg,
      link,
      image,
      customType
    );

    return res.status(200).send({
      status: true,
      message: result ? "成功發送訊息" : "發送訊息失敗",
      data: result,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//測試SB刪除使用者
router.post("/remove-token", async (req, res) => {
  try {
    let { userID } = req.body;

    const userInfo = await User.findOne({ userID });
    const { osType, deviceToken } = userInfo;

    const result = await sbUtil.removeRegisterToken(
      osType,
      userID,
      deviceToken
    );

    return res.status(200).send({
      status: true,
      message: result ? "成功解除token綁定" : "解除token綁定",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//測試更新已存在的使用者
router.post("/update-user", async (req, res) => {
  try {
    const { targetUserID } = req.body;

    const { userID, userName, userPhotos } = await User.findOne({
      userID: targetUserID,
    });

    const userPhoto = userPhotos && userPhotos.length > 0 ? userPhotos[0] : "";

    const result = await sbUtil.updateExistUser(userID, userName, userPhoto);

    return res.status(200).send({
      status: true,
      message: "更新完畢！",
      result,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

router.post("/update-users", async (req, res) => {
  try {
    const limiter = new Bottleneck({
      minTime: 100, // 至少間隔 150ms，一秒最多約 6~7 次
      maxConcurrent: 1, // 每次只跑一個，保證不併發
    });

    async function safeUpdateUser(user) {
      const userPhoto = user.userPhotos?.[0] || "";
      await sbUtil.updateExistUser(user.userID, user.userName, userPhoto);
      return { userID: user.userID, status: "success" };
    }

    const users = await User.find({ userValidCode: "1" });

    const results = [];

    for (const user of users) {
      try {
        const result = await limiter.schedule(() => safeUpdateUser(user));
        results.push(result);
      } catch (err) {
        results.push({
          userID: user.userID,
          status: "fail",
          error: err.message || err,
        });
      }
    }

    return res.status(200).send({
      status: true,
      message: "更新完畢！",
      results,
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

module.exports = router;
