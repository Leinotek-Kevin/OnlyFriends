const router = require("express").Router();

router.post("/google", async (req, res) => {
  try {
    // Sub/Pub 回傳格式
    // 參考文獻 ：https://developer.android.com/google/play/billing/rtdn-reference?hl=zh-tw#encoding
    // message: {
    //     data: '6YCZ5piv5LiA5YCL5ris6Kmm55qE6KiK5oGv',
    //     messageId: '13305506657050190',
    //     message_id: '13305506657050190',
    //     publishTime: '2024-12-17T08:42:41.576Z',
    //     publish_time: '2024-12-17T08:42:41.576Z'
    //     },
    // subscription: 'projects/onlyfriends-20295/subscriptions/subscription-sub'

    const { message } = req.body;
    let decodeMsg = "";

    if (message && message.data) {
      decodeMsg = Buffer.from(message.data, "base64").toString("utf-8");
    }

    return res.status(200).send({
      status: true,
      message: "收到 google 的消息",
      data: decodeMsg,
    });
  } catch (e) {
    console.log("收到異常 google 消息", e);
    return res.status(200).send({
      status: true,
      message: "收到異常 google 消息",
      e,
    });
  }
});

module.exports = router;
