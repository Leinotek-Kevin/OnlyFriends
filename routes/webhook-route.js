const router = require("express").Router();
const { books } = require("googleapis/build/src/apis/books");
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

    //退訂的回傳
    // {"version":"1.0","packageName":"com.anonymous.ipush","eventTimeMillis":"1734606334093","voidedPurchaseNotification":{"purchaseToken":"klklnbpjbipomjneihfpkegc.AO-J1Oy0pl5D_T4_kjt4UFZPOEQyZdVlpnGrEvGhC998-sTvqZ1w04ZqAVRpTFb9Q38hjUt3bjmTa0FRxtuFyMjr3fJqSgUIvw","orderId":"GPA.3346-3431-2321-61213","productType":1,"refundType":1}}

    const { message } = req.body;
    let decodeMsg = "";

    if (message && message.data) {
      decodeMsg = Buffer.from(message.data, "base64").toString("utf-8");
    }

    //console.log("收到 google 消息", decodeMsg);

    let notification = JSON.parse(decodeMsg);

    let notificationType = notification.subscriptionNotification;
    const voidedPurchase = notification.voidedPurchaseNotification;

    //處理訂單訂閱狀態變化
    if (notificationType) {
      switch (notificationType) {
        case 4:
          console.log("訂閱成功！");
          // 處理訂閱更新或成功的邏輯
          break;
        case 13:
          console.log("訂閱取消或退款");
          // 處理訂閱取消或退款的邏輯
          break;
        default:
          console.log(`其他類型的通知: ${notificationType}`);
          break;
      }

      let {
        packageName,
        subscriptionNotification: { purchaseToken, subscriptionId },
      } = notification;

      const result = await googleUtil.validSubscriptionOrder(
        packageName,
        subscriptionId,
        purchaseToken
      );

      return res.status(200).send({
        status: true,
        message: result ? "訂單驗證成功" : "訂單驗證失敗",
        data: result,
      });
    } else if (voidedPurchase) {
      // 處理退款或訂單無效的情況
      // 根據 refundType 和 productType 來判斷退款的原因及處理

      return res.status(200).send({
        status: true,
        message: "處理退款或訂單無效的情況",
        data: {},
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "訂單驗證出現異常！",
      data: e,
    });
  }
});

module.exports = router;
