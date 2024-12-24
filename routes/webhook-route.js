const router = require("express").Router();
const googleUtil = require("../utils/google-util");
const User = require("../models").user;
const Purchase = require("../models").purchase;

router.post("/google-purchase", async (req, res) => {
  try {
    const { message } = req.body;
    let decodeMsg = "";

    if (message && message.data) {
      decodeMsg = Buffer.from(message.data, "base64").toString("utf-8");
    }

    let notification = JSON.parse(decodeMsg);

    console.log("receive google purchase MSG : ", decodeMsg);

    //確認是否是現在用戶的訂閱訂單

    let subscriptionNotification = notification.subscriptionNotification;
    const voidedPurchaseNotification = notification.voidedPurchaseNotification;

    //處理訂單訂閱狀態變化
    if (subscriptionNotification) {
      let {
        packageName,
        subscriptionNotification: { purchaseToken, subscriptionId },
      } = notification;

      let notificationType = subscriptionNotification.notificationType;
      let purchaseMemo = "";

      //驗證 Google 訂單
      const data = await googleUtil.validSubscriptionOrder(
        packageName,
        subscriptionId,
        purchaseToken
      );

      //追蹤目前訂單情況
      switch (notificationType) {
        case 1:
          purchaseMemo =
            "訂閱項目已從帳戶保留狀態恢復 :SUBSCRIPTION_RECOVERED (1)";
          break;
        case 2:
          purchaseMemo = "訂閱已續訂:SUBSCRIPTION_RENEWED (2)";
          break;
        case 3:
          purchaseMemo = "自願或非自願取消訂閱: SUBSCRIPTION_CANCELED  (3)";
          break;
        case 4:
          purchaseMemo = "使用者已購買新的訂閱項目:SUBSCRIPTION_PURCHASED (4)";
          //確定訂閱訂單
          if (data.acknowledgementState == 0) {
            await googleUtil.acknowledgeSubscription(
              packageName,
              subscriptionId,
              purchaseToken
            );
          }
          break;
        case 5:
          purchaseMemo = "訂閱項目已進入帳戶保留狀態: SUBSCRIPTION_ON_HOLD (5)";
          break;
        case 6:
          purchaseMemo =
            "訂閱項目已進入寬限期:SUBSCRIPTION_IN_GRACE_PERIOD (6)";
          break;
        case 7:
          purchaseMemo =
            "使用者已從「Play」>「帳戶」>「訂閱」還原訂閱項目。訂閱項目已取消，但在使用者還原時尚未到期: SUBSCRIPTION_RESTARTED (7)";
          break;
        case 8:
          purchaseMemo =
            "使用者已成功確認訂閱項目價格異動:  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED (8)";
          break;
        case 9:
          purchaseMemo = "訂閱項目的週期時間已延長:SUBSCRIPTION_DEFERRED (9)";
          break;
        case 10:
          purchaseMemo = "訂閱項目已暫停: SUBSCRIPTION_PAUSED (10) ";
          break;
        case 11:
          purchaseMemo =
            "訂閱暫停時間表已變更 : SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED (11)";
          break;
        case 12:
          purchaseMemo =
            "使用者在訂閱到期前已取消訂閱項目:SUBSCRIPTION_REVOKED (12)";
          break;
        case 13:
          purchaseMemo = "訂閱項目已到期:SUBSCRIPTION_EXPIRED (13)";
          break;
        case 20:
          purchaseMemo =
            "未完成交易被取消 : SUBSCRIPTION_PENDING_PURCHASE_CANCELED (20)";
          break;

        default:
          console.log(`其他類型的通知: ${notificationType}`);
          break;
      }

      console.log("訂閱狀態通知", purchaseMemo);
      console.log("驗證結果", data);

      //分析驗證訂閱的資料
      const {
        orderId, // 訂單ＩＤ GPA.3357-5076-3532-61828..5 標示該筆訂單續訂5次
        startTimeMillis, //這是訂閱生效的時間
        expiryTimeMillis, // 這是訂閱結束的時間
        autoRenewing, //是否自動訂閱
        paymentState, //付款狀態
        cancelReason, //訂閱取消的原因（如果訂閱被取消）。常見的取消原因有：0: 用戶取消。 1: 付款問題（例如信用卡過期）
        acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認
      } = data;

      //真正的訂單id
      const splitOrderID = orderId.split("..");
      let realID = splitOrderID[0];
      let renewCount = 0;

      if (splitOrderID.length > 1) {
        // .. 後面是指續訂次數
        renewCount = Number(splitOrderID[1]);
      }

      //訂閱已過期 || 付款處理中 || 待處理的延遲升級/降級 => 不允許訂閱
      let isAllow = true;

      if (
        paymentState === 0 || // 付款處理中
        paymentState === 3 || // 待處理的延遲升級/降級
        !expiryTimeMillis || // 檢查 expiryTimeMillis 是否存在
        expiryTimeMillis < Date.now() // 檢查訂閱是否過期
      ) {
        isAllow = false;
      }

      //更新該筆訂單的狀態
      //購買紀錄
      const result = await Purchase.findOneAndUpdate(
        { orderID: realID },
        {
          startDate: startTimeMillis,
          expiryDate: expiryTimeMillis,
          autoRenewing,
          renewCount,
          paymentState,
          cancelReason,
          acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認,
          purchaseMemo,
          isAllow,
        },
        {
          upsert: true,
          new: true,
        }
      );

      //檢查這筆訂單是不是目前的活躍訂單,並判斷用戶是否有訂閱權
      if (result) {
        console.log("更新返回結果", result);
      }
    } else if (voidedPurchaseNotification) {
      // 根據 refundType 和 productType 來判斷退款的原因及處理
      //productType : PRODUCT_TYPE_SUBSCRIPTION (1) 訂閱交易已作廢 / PRODUCT_TYPE_ONE_TIME (2) 一次性消費交易已作廢
      //refundType : REFUND_TYPE_FULL_REFUND (2) 交易已完全作廢 / REFUND_TYPE_QUANTITY_BASED_PARTIAL_REFUND 購買的商品遭到部分商品退款 僅適用於多件購買交易。購買動作可以是 部分作廢項目可能會多次作廢
      //purchaseMemo = "處理退款或訂單無效";
      console.log("處理退款或訂單無效");
    }

    //console.log(purchaseMemo);

    return res.status(200).send({
      status: true,
      message: "處理完畢",
    });
  } catch (e) {
    return res.status(500).send({
      status: false,
      message: "訂單驗證出現異常！",
      e,
    });
  }
});

//iOS
router.post("/iOS-purchase", async (req, res) => {
  try {
    const data = JSON.parse(req.body);

    console.log("iOS 購買信息:", data);

    return res.status(200).send({
      status: true,
      message: "iOS 購買信息",
    });
  } catch (e) {
    return res.status(200).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

module.exports = router;

//Google Sub/Pub 回傳格式
//參考文獻 ：https://developer.android.com/google/play/billing/rtdn-reference?hl=zh-tw#encoding
//message: {
//     data: '6YCZ5piv5LiA5YCL5ris6Kmm55qE6KiK5oGv',
//     messageId: '13305506657050190',
//     message_id: '13305506657050190',
//     publishTime: '2024-12-17T08:42:41.576Z',
//     publish_time: '2024-12-17T08:42:41.576Z'
//     },
//subscription: 'projects/onlyfriends-20295/subscriptions/subscription-sub'
