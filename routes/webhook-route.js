const router = require("express").Router();
const googleUtil = require("../utils/google-util");

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

    // {"version":"1.0","packageName":"com.anonymous.ipush","eventTimeMillis":"1734430600990","
    // subscriptionNotification":{"version":"1.0","notificationType":4,
    // "purchaseToken":"lndfcnmcdjahebbikcnhdokb.AO-J1OwbenosvkJQsvtKKvopSoI6dPP3PezGkK6WskhZFJxZX_WCc9EqHxNcSMKg0EVXAKfKDqElQ0uZeGbjtY6fj8vNgvf3jg",
    // "subscriptionId":"lovepush_monthly_150"}}

    const { message } = req.body;
    let decodeMsg = "";

    if (message && message.data) {
      decodeMsg = Buffer.from(message.data, "base64").toString("utf-8");
    }

    console.log("收到 google 消息", decodeMsg);

    let {
      packageName,
      subscriptionNotification: { purchaseToken, subscriptionId },
    } = JSON.parse(decodeMsg);

    const data = {
      packageName,
      purchaseToken,
      subscriptionId,
    };

    return res.status(200).send({
      status: true,
      message: "驗證訂單",
      data,
    });

    // const result = googleUtil.validSubscriptionOrder(
    //   packageName,
    //   subscriptionId,
    //   purchaseToken
    // );

    // return res.status(200).send({
    //   status: true,
    //   message: "驗證訂單",
    //   data: result,
    // });
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
