const router = require("express").Router();
const SendBird = require("sendbird");

//設置 SendBird SDK
const sendbird = new SendBird({
  appId: "F8BBB278-0FD3-427F-8EDA-286D43191999",
});

router.use((req, res, next) => {
  console.log("正在接收一個跟 test user 有關的請求");
  next();
});

router.post("/connect", (req, res) => {
  const { userId, nickname } = req.body;

  // 驗證請求是否正確
  if (!userId || !nickname) {
    return res.status(400).json({ error: "UserId and nickname are required." });
  }

  // 使用 userId 來連接到 SendBird
  sendbird.connect(userId, (user, error) => {
    if (error) {
      console.error("Error connecting to SendBird:", error);
      return res.status(500).json({ error: "Failed to connect to SendBird." });
    }

    // 成功連接後更新暱稱
    sendbird.updateCurrentUserInfo(nickname, null, (response, updateError) => {
      if (updateError) {
        console.error("Error updating user info:", updateError);
        return res
          .status(500)
          .json({ error: "Failed to update user nickname." });
      }

      res.json({ message: "User connected successfully.", user });
    });
  });
});

router.post("/create-channel", async (req, res) => {
  const { userAId, userBId } = req.body;
  sendbird.connect(userAId, (userA, errorA) => {
    if (errorA) {
      return res
        .status(500)
        .json({ error: `Failed to connect User A: ${errorA.message}` });
    } else {
      console.log(userA);
    }
  });

  sendbird.connect(userBId, (userB, errorB) => {
    if (errorB) {
      return res
        .status(500)
        .json({ error: `Failed to connect User B: ${errorB.message}` });
    } else {
      console.log(userB);
    }
  });

  // 確認用戶連接成功，接著創建頻道
  // 創建或獲取一對一聊天頻道
  const channelParams = {
    invitedUserIds: [userAId, userBId], // 最基礎參數
    isDistinct: true, // 確保頻道唯一
  };

  sendbird.GroupChannel.createChannel(channelParams, (channel, error) => {
    if (error) {
      return res
        .status(500)
        .json({ error: `Error creating channel: ${error.message}` });
    }
    res.json({ channelId: channel.channelUrl });
  });
});

module.exports = router;
