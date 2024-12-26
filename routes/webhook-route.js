const router = require("express").Router();
const googleUtil = require("../utils/google-util");
const iOSUtil = require("../utils/iOS-util");
const generalUtil = require("../utils/general-util");
const jwt = require("jsonwebtoken");
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
    //分析獲得的通知訊息
    let purchaseMemo = analyticsPurchaseMemo(notification);
    console.log("訂閱狀態通知", purchaseMemo);

    //確認是否是現在用戶的訂閱訂單
    const { subscriptionNotification, voidedPurchaseNotification } =
      notification;

    //訂閱訂單狀態變化通知
    if (subscriptionNotification) {
      let {
        packageName,
        subscriptionNotification: { purchaseToken, subscriptionId },
      } = notification;

      //驗證 Google 訂單
      const data = await googleUtil.validSubscriptionOrder(
        packageName,
        subscriptionId,
        purchaseToken
      );

      //確定訂閱訂單
      if (data.acknowledgementState == 0) {
        await googleUtil.acknowledgeSubscription(
          packageName,
          subscriptionId,
          purchaseToken
        );
      }

      console.log("驗證結果:", data);

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

      //檢查用戶最近一筆訂單記錄,並判斷是否有訂閱權
      checkAllowSubscription(result);
    } else if (voidedPurchaseNotification) {
      // 根據 refundType來判斷退款的原因及處理
      let {
        voidedPurchaseNotification: { orderId, refundType },
      } = notification;

      //更新該筆訂單狀態
      const result = await Purchase.findOneAndUpdate(
        { orderID: orderId },
        {
          $set: {
            refundType,
            isAllow: false,
            purchaseMemo,
          },
        },
        { new: true }
      );

      //檢查用戶最近一筆訂單記錄,並判斷是否有訂閱權
      checkAllowSubscription(result);
    }

    return res.status(200).send({
      status: true,
      message: "處理完畢",
    });
  } catch (e) {
    console.log(e);
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
    const notificationInfo = iOSUtil.anaTransNotification(
      req.body.signedPayload
    );

    if (notificationInfo) {
      let { notificationType, subtype } = notificationInfo;

      console.log(
        "通知類型:",
        `notificationType : ${notificationType} , subtype : ${subtype}`
      );

      //處理通知可能的事件
      // SUBSCRIBED 事件 (訂閱購買)
      if (notificationType == "SUBSCRIBED") {
        if (subtype == "INITIAL_BUY") {
          console.log("用戶首次訂閱");
        }

        if (subtype == "RESUBSCRIBE") {
          console.log("用戶再次訂閱");
        }
      }

      // DID_RENEW 事件 (訂閱續訂)
      if (notificationType == "DID_RENEW") {
        console.log("用戶續訂");
      }

      //EXPIRED 事件 (訂閱過期)
      if (notificationType == "EXPIRED") {
        if (subtype == "VOLUNTARY") {
          console.log("訂閱已過期!");
        }
      }

      //DID_FAIL_TO_RENEW 事件 (續訂失敗)
      if (notificationType == "DID_FAIL_TO_RENEW") {
        if (subtype == "FAILURE") {
          console.log("續訂失敗，通常是支付失敗");
        }
      }

      if (notificationType == "DID_CHANGE_RENEWAL_PREF") {
        if (subtype == "DOWNGRADE") {
          //console.log("續訂失敗，通常是支付失敗");
        }

        if (subtype == "UPGRADE") {
          //console.log("續訂失敗，通常是支付失敗");
        }
      }

      //GRACE_PERIOD_EXPIRED 事件 (寬限期過期)
      if (notificationType == "GRACE_PERIOD_EXPIRED") {
        if (subtype == "GRACE_PERIOD") {
          console.log("訂閱進入寬限期並且寬限期已過");
        }
      }

      if (notificationType == "DID_CHANGE_RENEWAL_STATUS") {
        if (subtype == "AUTO_RENEW_DISABLED") {
          console.log("用戶取消訂閱");
        }
      }

      //REFUND 事件 (退款)
      if (notificationType == "REFUND") {
        if (subtype == "REFUND") {
          console.log("用戶申請退款");
        }
      }

      //REVOKE 事件 (撤銷訂閱)
      if (notificationType == "REVOKE") {
        if (subtype == "REVOKE") {
          console.log("訂閱被撤銷，可能是由於支付問題或其他原因");
        }
      }

      //PRICE_INCREASE 事件 (價格增加)
      if (notificationType == "PRICE_INCREASE") {
        if (subtype == "PRICE_INCREASE") {
          console.log("訂閱的價格變動");
        }
      }
    }

    return res.status(200).send({
      status: true,
      message: notificationInfo
        ? "iOS 購買信息處理完成"
        : "iOS 購買信息處理失敗",
    });
  } catch (e) {
    console.log("iOS 購買錯誤:", e);
    return res.status(200).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//檢查用戶是否有訂閱權
async function checkAllowSubscription(userData) {
  if (userData) {
    let { userID, orderID } = userData;

    //用戶最近一筆訂單記錄
    const lastPurchase = await Purchase.findOne({ userID })
      .sort({ createDate: -1 })
      .limit(1);

    if (lastPurchase) {
      let lastOrderID = lastPurchase.orderID;

      if (orderID == lastOrderID) {
        //表示目前通知的狀態是最近一筆訂單的狀態
        await User.updateOne({ userID }, { isSubscription: userData.isAllow });
      }
    }
  }
}

//分析 Google 訂閱單購通知訊息
function analyticsPurchaseMemo(notification) {
  let purchaseMemo = "";

  const { subscriptionNotification, voidedPurchaseNotification } = notification;

  if (subscriptionNotification) {
    let notificationType = subscriptionNotification.notificationType;
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
        break;
      case 5:
        purchaseMemo = "訂閱項目已進入帳戶保留狀態: SUBSCRIPTION_ON_HOLD (5)";
        break;
      case 6:
        purchaseMemo = "訂閱項目已進入寬限期:SUBSCRIPTION_IN_GRACE_PERIOD (6)";
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
        purchaseMemo = `其他類型的通知${notificationType}`;
        break;
    }
  } else if (voidedPurchaseNotification) {
    let refundType = voidedPurchaseNotification.refundType;

    purchaseMemo =
      refundType == "2"
        ? "REFUND_TYPE_FULL_REFUND (2) 交易已完全作廢"
        : "REFUND_TYPE_QUANTITY_BASED_PARTIAL_REFUND 購買的商品遭到部分商品退款";
  }

  return purchaseMemo;
}

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

//iOS
// {
// notificationType: 'SUBSCRIBED',
// subtype: 'INITIAL_BUY',
//  notificationUUID: '136558d0-2c10-42f1-b928-51ec98b426a9',
//  data: {
//  appAppleId: 6578435303,
//  bundleId: 'com.leinotek.LovePush',
//  bundleVersion: '9',
//  environment: 'Sandbox',
//  signedTransactionInfo: 'eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlFTURDQ0E3YWdBd0lCQWdJUWZUbGZkMGZOdkZXdnpDMVlJQU5zWGpBS0JnZ3Foa2pPUFFRREF6QjFNVVF3UWdZRFZRUURERHRCY0hCc1pTQlhiM0pzWkhkcFpHVWdSR1YyWld4dmNHVnlJRkpsYkdGMGFXOXVjeUJEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURUxNQWtHQTFVRUN3d0NSell4RXpBUkJnTlZCQW9NQ2tGd2NHeGxJRWx1WXk0eEN6QUpCZ05WQkFZVEFsVlRNQjRYRFRJek1Ea3hNakU1TlRFMU0xb1hEVEkxTVRBeE1URTVOVEUxTWxvd2daSXhRREErQmdOVkJBTU1OMUJ5YjJRZ1JVTkRJRTFoWXlCQmNIQWdVM1J2Y21VZ1lXNWtJR2xVZFc1bGN5QlRkRzl5WlNCU1pXTmxhWEIwSUZOcFoyNXBibWN4TERBcUJnTlZCQXNNSTBGd2NHeGxJRmR2Y214a2QybGtaU0JFWlhabGJHOXdaWElnVW1Wc1lYUnBiMjV6TVJNd0VRWURWUVFLREFwQmNIQnNaU0JKYm1NdU1Rc3dDUVlEVlFRR0V3SlZVekJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCRUZFWWUvSnFUcXlRdi9kdFhrYXVESENTY1YxMjlGWVJWLzB4aUIyNG5DUWt6UWYzYXNISk9OUjVyMFJBMGFMdko0MzJoeTFTWk1vdXZ5ZnBtMjZqWFNqZ2dJSU1JSUNCREFNQmdOVkhSTUJBZjhFQWpBQU1COEdBMVVkSXdRWU1CYUFGRDh2bENOUjAxREptaWc5N2JCODVjK2xrR0taTUhBR0NDc0dBUVVGQndFQkJHUXdZakF0QmdnckJnRUZCUWN3QW9ZaGFIUjBjRG92TDJObGNuUnpMbUZ3Y0d4bExtTnZiUzkzZDJSeVp6WXVaR1Z5TURFR0NDc0dBUVVGQnpBQmhpVm9kSFJ3T2k4dmIyTnpjQzVoY0hCc1pTNWpiMjB2YjJOemNEQXpMWGQzWkhKbk5qQXlNSUlCSGdZRFZSMGdCSUlCRlRDQ0FSRXdnZ0VOQmdvcWhraUc5Mk5rQlFZQk1JSCtNSUhEQmdnckJnRUZCUWNDQWpDQnRneUJzMUpsYkdsaGJtTmxJRzl1SUhSb2FYTWdZMlZ5ZEdsbWFXTmhkR1VnWW5rZ1lXNTVJSEJoY25SNUlHRnpjM1Z0WlhNZ1lXTmpaWEIwWVc1alpTQnZaaUIwYUdVZ2RHaGxiaUJoY0hCc2FXTmhZbXhsSUhOMFlXNWtZWEprSUhSbGNtMXpJR0Z1WkNCamIyNWthWFJwYjI1eklHOW1JSFZ6WlN3Z1kyVnlkR2xtYVdOaGRHVWdjRzlzYVdONUlHRnVaQ0JqWlhKMGFXWnBZMkYwYVc5dUlIQnlZV04wYVdObElITjBZWFJsYldWdWRITXVNRFlHQ0NzR0FRVUZCd0lCRmlwb2RIUndPaTh2ZDNkM0xtRndjR3hsTG1OdmJTOWpaWEowYVdacFkyRjBaV0YxZEdodmNtbDBlUzh3SFFZRFZSME9CQllFRkFNczhQanM2VmhXR1FsekUyWk9FK0dYNE9vL01BNEdBMVVkRHdFQi93UUVBd0lIZ0RBUUJnb3Foa2lHOTJOa0Jnc0JCQUlGQURBS0JnZ3Foa2pPUFFRREF3Tm9BREJsQWpFQTh5Uk5kc2twNTA2REZkUExnaExMSndBdjVKOGhCR0xhSThERXhkY1BYK2FCS2pqTzhlVW85S3BmcGNOWVVZNVlBakFQWG1NWEVaTCtRMDJhZHJtbXNoTnh6M05uS20rb3VRd1U3dkJUbjBMdmxNN3ZwczJZc2xWVGFtUllMNGFTczVrPSIsIk1JSURGakNDQXB5Z0F3SUJBZ0lVSXNHaFJ3cDBjMm52VTRZU3ljYWZQVGp6Yk5jd0NnWUlLb1pJemowRUF3TXdaekViTUJrR0ExVUVBd3dTUVhCd2JHVWdVbTl2ZENCRFFTQXRJRWN6TVNZd0pBWURWUVFMREIxQmNIQnNaU0JEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURVRNQkVHQTFVRUNnd0tRWEJ3YkdVZ1NXNWpMakVMTUFrR0ExVUVCaE1DVlZNd0hoY05NakV3TXpFM01qQXpOekV3V2hjTk16WXdNekU1TURBd01EQXdXakIxTVVRd1FnWURWUVFERER0QmNIQnNaU0JYYjNKc1pIZHBaR1VnUkdWMlpXeHZjR1Z5SUZKbGJHRjBhVzl1Y3lCRFpYSjBhV1pwWTJGMGFXOXVJRUYxZEdodmNtbDBlVEVMTUFrR0ExVUVDd3dDUnpZeEV6QVJCZ05WQkFvTUNrRndjR3hsSUVsdVl5NHhDekFKQmdOVkJBWVRBbFZUTUhZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUNJRFlnQUVic1FLQzk0UHJsV21aWG5YZ3R4emRWSkw4VDBTR1luZ0RSR3BuZ24zTjZQVDhKTUViN0ZEaTRiQm1QaENuWjMvc3E2UEYvY0djS1hXc0w1dk90ZVJoeUo0NXgzQVNQN2NPQithYW85MGZjcHhTdi9FWkZibmlBYk5nWkdoSWhwSW80SDZNSUgzTUJJR0ExVWRFd0VCL3dRSU1BWUJBZjhDQVFBd0h3WURWUjBqQkJnd0ZvQVV1N0Rlb1ZnemlKcWtpcG5ldnIzcnI5ckxKS3N3UmdZSUt3WUJCUVVIQVFFRU9qQTRNRFlHQ0NzR0FRVUZCekFCaGlwb2RIUndPaTh2YjJOemNDNWhjSEJzWlM1amIyMHZiMk56Y0RBekxXRndjR3hsY205dmRHTmhaek13TndZRFZSMGZCREF3TGpBc29DcWdLSVltYUhSMGNEb3ZMMk55YkM1aGNIQnNaUzVqYjIwdllYQndiR1Z5YjI5MFkyRm5NeTVqY213d0hRWURWUjBPQkJZRUZEOHZsQ05SMDFESm1pZzk3YkI4NWMrbGtHS1pNQTRHQTFVZER3RUIvd1FFQXdJQkJqQVFCZ29xaGtpRzkyTmtCZ0lCQkFJRkFEQUtCZ2dxaGtqT1BRUURBd05vQURCbEFqQkFYaFNxNUl5S29nTUNQdHc0OTBCYUI2NzdDYUVHSlh1ZlFCL0VxWkdkNkNTamlDdE9udU1UYlhWWG14eGN4ZmtDTVFEVFNQeGFyWlh2TnJreFUzVGtVTUkzM3l6dkZWVlJUNHd4V0pDOTk0T3NkY1o0K1JHTnNZRHlSNWdtZHIwbkRHZz0iLCJNSUlDUXpDQ0FjbWdBd0lCQWdJSUxjWDhpTkxGUzVVd0NnWUlLb1pJemowRUF3TXdaekViTUJrR0ExVUVBd3dTUVhCd2JHVWdVbTl2ZENCRFFTQXRJRWN6TVNZd0pBWURWUVFMREIxQmNIQnNaU0JEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURVRNQkVHQTFVRUNnd0tRWEJ3YkdVZ1NXNWpMakVMTUFrR0ExVUVCaE1DVlZNd0hoY05NVFF3TkRNd01UZ3hPVEEyV2hjTk16a3dORE13TVRneE9UQTJXakJuTVJzd0dRWURWUVFEREJKQmNIQnNaU0JTYjI5MElFTkJJQzBnUnpNeEpqQWtCZ05WQkFzTUhVRndjR3hsSUVObGNuUnBabWxqWVhScGIyNGdRWFYwYUc5eWFYUjVNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVFzd0NRWURWUVFHRXdKVlV6QjJNQkFHQnlxR1NNNDlBZ0VHQlN1QkJBQWlBMklBQkpqcEx6MUFjcVR0a3lKeWdSTWMzUkNWOGNXalRuSGNGQmJaRHVXbUJTcDNaSHRmVGpqVHV4eEV0WC8xSDdZeVlsM0o2WVJiVHpCUEVWb0EvVmhZREtYMUR5eE5CMGNUZGRxWGw1ZHZNVnp0SzUxN0lEdll1VlRaWHBta09sRUtNYU5DTUVBd0hRWURWUjBPQkJZRUZMdXczcUZZTTRpYXBJcVozcjY5NjYvYXl5U3JNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdEZ1lEVlIwUEFRSC9CQVFEQWdFR01Bb0dDQ3FHU000OUJBTURBMmdBTUdVQ01RQ0Q2Y0hFRmw0YVhUUVkyZTN2OUd3T0FFWkx1Tit5UmhIRkQvM21lb3locG12T3dnUFVuUFdUeG5TNGF0K3FJeFVDTUcxbWloREsxQTNVVDgyTlF6NjBpbU9sTTI3amJkb1h0MlFmeUZNbStZaGlkRGtMRjF2TFVhZ002QmdENTZLeUtBPT0iXX0.eyJ0cmFuc2FjdGlvbklkIjoiMjAwMDAwMDgxNjA3MjQyMSIsIm9yaWdpbmFsVHJhbnNhY3Rpb25JZCI6IjIwMDAwMDA4MTYwNzI0MjEiLCJ3ZWJPcmRlckxpbmVJdGVtSWQiOiIyMDAwMDAwMDg0ODczMzQ0IiwiYnVuZGxlSWQiOiJjb20ubGVpbm90ZWsuTG92ZVB1c2giLCJwcm9kdWN0SWQiOiJsb3ZlcHVzaF9tb250aGx5XzE1MCIsInN1YnNjcmlwdGlvbkdyb3VwSWRlbnRpZmllciI6IjIxNTE4MTUyIiwicHVyY2hhc2VEYXRlIjoxNzM1MTg4Mzk0MDAwLCJvcmlnaW5hbFB1cmNoYXNlRGF0ZSI6MTczNTE4ODM5NDAwMCwiZXhwaXJlc0RhdGUiOjE3MzUxOTE5OTQwMDAsInF1YW50aXR5IjoxLCJ0eXBlIjoiQXV0by1SZW5ld2FibGUgU3Vic2NyaXB0aW9uIiwiaW5BcHBPd25lcnNoaXBUeXBlIjoiUFVSQ0hBU0VEIiwic2lnbmVkRGF0ZSI6MTczNTE4ODQwOTgyNCwiZW52aXJvbm1lbnQiOiJTYW5kYm94IiwidHJhbnNhY3Rpb25SZWFzb24iOiJQVVJDSEFTRSIsInN0b3JlZnJvbnQiOiJUV04iLCJzdG9yZWZyb250SWQiOiIxNDM0NzAiLCJwcmljZSI6MTUwMDAwLCJjdXJyZW5jeSI6IlRXRCJ9.ivbvMYJbAeagrXfd4_pOFk0KDIERYZDwYPK-GE4yuBTA1ewF9QqLvQ-xrgHq3eeHCpGbO4MlnxfDRvRaf7v3Kg',
//  signedRenewalInfo: 'eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlFTURDQ0E3YWdBd0lCQWdJUWZUbGZkMGZOdkZXdnpDMVlJQU5zWGpBS0JnZ3Foa2pPUFFRREF6QjFNVVF3UWdZRFZRUURERHRCY0hCc1pTQlhiM0pzWkhkcFpHVWdSR1YyWld4dmNHVnlJRkpsYkdGMGFXOXVjeUJEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURUxNQWtHQTFVRUN3d0NSell4RXpBUkJnTlZCQW9NQ2tGd2NHeGxJRWx1WXk0eEN6QUpCZ05WQkFZVEFsVlRNQjRYRFRJek1Ea3hNakU1TlRFMU0xb1hEVEkxTVRBeE1URTVOVEUxTWxvd2daSXhRREErQmdOVkJBTU1OMUJ5YjJRZ1JVTkRJRTFoWXlCQmNIQWdVM1J2Y21VZ1lXNWtJR2xVZFc1bGN5QlRkRzl5WlNCU1pXTmxhWEIwSUZOcFoyNXBibWN4TERBcUJnTlZCQXNNSTBGd2NHeGxJRmR2Y214a2QybGtaU0JFWlhabGJHOXdaWElnVW1Wc1lYUnBiMjV6TVJNd0VRWURWUVFLREFwQmNIQnNaU0JKYm1NdU1Rc3dDUVlEVlFRR0V3SlZVekJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCRUZFWWUvSnFUcXlRdi9kdFhrYXVESENTY1YxMjlGWVJWLzB4aUIyNG5DUWt6UWYzYXNISk9OUjVyMFJBMGFMdko0MzJoeTFTWk1vdXZ5ZnBtMjZqWFNqZ2dJSU1JSUNCREFNQmdOVkhSTUJBZjhFQWpBQU1COEdBMVVkSXdRWU1CYUFGRDh2bENOUjAxREptaWc5N2JCODVjK2xrR0taTUhBR0NDc0dBUVVGQndFQkJHUXdZakF0QmdnckJnRUZCUWN3QW9ZaGFIUjBjRG92TDJObGNuUnpMbUZ3Y0d4bExtTnZiUzkzZDJSeVp6WXVaR1Z5TURFR0NDc0dBUVVGQnpBQmhpVm9kSFJ3T2k4dmIyTnpjQzVoY0hCc1pTNWpiMjB2YjJOemNEQXpMWGQzWkhKbk5qQXlNSUlCSGdZRFZSMGdCSUlCRlRDQ0FSRXdnZ0VOQmdvcWhraUc5Mk5rQlFZQk1JSCtNSUhEQmdnckJnRUZCUWNDQWpDQnRneUJzMUpsYkdsaGJtTmxJRzl1SUhSb2FYTWdZMlZ5ZEdsbWFXTmhkR1VnWW5rZ1lXNTVJSEJoY25SNUlHRnpjM1Z0WlhNZ1lXTmpaWEIwWVc1alpTQnZaaUIwYUdVZ2RHaGxiaUJoY0hCc2FXTmhZbXhsSUhOMFlXNWtZWEprSUhSbGNtMXpJR0Z1WkNCamIyNWthWFJwYjI1eklHOW1JSFZ6WlN3Z1kyVnlkR2xtYVdOaGRHVWdjRzlzYVdONUlHRnVaQ0JqWlhKMGFXWnBZMkYwYVc5dUlIQnlZV04wYVdObElITjBZWFJsYldWdWRITXVNRFlHQ0NzR0FRVUZCd0lCRmlwb2RIUndPaTh2ZDNkM0xtRndjR3hsTG1OdmJTOWpaWEowYVdacFkyRjBaV0YxZEdodmNtbDBlUzh3SFFZRFZSME9CQllFRkFNczhQanM2VmhXR1FsekUyWk9FK0dYNE9vL01BNEdBMVVkRHdFQi93UUVBd0lIZ0RBUUJnb3Foa2lHOTJOa0Jnc0JCQUlGQURBS0JnZ3Foa2pPUFFRREF3Tm9BREJsQWpFQTh5Uk5kc2twNTA2REZkUExnaExMSndBdjVKOGhCR0xhSThERXhkY1BYK2FCS2pqTzhlVW85S3BmcGNOWVVZNVlBakFQWG1NWEVaTCtRMDJhZHJtbXNoTnh6M05uS20rb3VRd1U3dkJUbjBMdmxNN3ZwczJZc2xWVGFtUllMNGFTczVrPSIsIk1JSURGakNDQXB5Z0F3SUJBZ0lVSXNHaFJ3cDBjMm52VTRZU3ljYWZQVGp6Yk5jd0NnWUlLb1pJemowRUF3TXdaekViTUJrR0ExVUVBd3dTUVhCd2JHVWdVbTl2ZENCRFFTQXRJRWN6TVNZd0pBWURWUVFMREIxQmNIQnNaU0JEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURVRNQkVHQTFVRUNnd0tRWEJ3YkdVZ1NXNWpMakVMTUFrR0ExVUVCaE1DVlZNd0hoY05NakV3TXpFM01qQXpOekV3V2hjTk16WXdNekU1TURBd01EQXdXakIxTVVRd1FnWURWUVFERER0QmNIQnNaU0JYYjNKc1pIZHBaR1VnUkdWMlpXeHZjR1Z5SUZKbGJHRjBhVzl1Y3lCRFpYSjBhV1pwWTJGMGFXOXVJRUYxZEdodmNtbDBlVEVMTUFrR0ExVUVDd3dDUnpZeEV6QVJCZ05WQkFvTUNrRndjR3hsSUVsdVl5NHhDekFKQmdOVkJBWVRBbFZUTUhZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUNJRFlnQUVic1FLQzk0UHJsV21aWG5YZ3R4emRWSkw4VDBTR1luZ0RSR3BuZ24zTjZQVDhKTUViN0ZEaTRiQm1QaENuWjMvc3E2UEYvY0djS1hXc0w1dk90ZVJoeUo0NXgzQVNQN2NPQithYW85MGZjcHhTdi9FWkZibmlBYk5nWkdoSWhwSW80SDZNSUgzTUJJR0ExVWRFd0VCL3dRSU1BWUJBZjhDQVFBd0h3WURWUjBqQkJnd0ZvQVV1N0Rlb1ZnemlKcWtpcG5ldnIzcnI5ckxKS3N3UmdZSUt3WUJCUVVIQVFFRU9qQTRNRFlHQ0NzR0FRVUZCekFCaGlwb2RIUndPaTh2YjJOemNDNWhjSEJzWlM1amIyMHZiMk56Y0RBekxXRndjR3hsY205dmRHTmhaek13TndZRFZSMGZCREF3TGpBc29DcWdLSVltYUhSMGNEb3ZMMk55YkM1aGNIQnNaUzVqYjIwdllYQndiR1Z5YjI5MFkyRm5NeTVqY213d0hRWURWUjBPQkJZRUZEOHZsQ05SMDFESm1pZzk3YkI4NWMrbGtHS1pNQTRHQTFVZER3RUIvd1FFQXdJQkJqQVFCZ29xaGtpRzkyTmtCZ0lCQkFJRkFEQUtCZ2dxaGtqT1BRUURBd05vQURCbEFqQkFYaFNxNUl5S29nTUNQdHc0OTBCYUI2NzdDYUVHSlh1ZlFCL0VxWkdkNkNTamlDdE9udU1UYlhWWG14eGN4ZmtDTVFEVFNQeGFyWlh2TnJreFUzVGtVTUkzM3l6dkZWVlJUNHd4V0pDOTk0T3NkY1o0K1JHTnNZRHlSNWdtZHIwbkRHZz0iLCJNSUlDUXpDQ0FjbWdBd0lCQWdJSUxjWDhpTkxGUzVVd0NnWUlLb1pJemowRUF3TXdaekViTUJrR0ExVUVBd3dTUVhCd2JHVWdVbTl2ZENCRFFTQXRJRWN6TVNZd0pBWURWUVFMREIxQmNIQnNaU0JEWlhKMGFXWnBZMkYwYVc5dUlFRjFkR2h2Y21sMGVURVRNQkVHQTFVRUNnd0tRWEJ3YkdVZ1NXNWpMakVMTUFrR0ExVUVCaE1DVlZNd0hoY05NVFF3TkRNd01UZ3hPVEEyV2hjTk16a3dORE13TVRneE9UQTJXakJuTVJzd0dRWURWUVFEREJKQmNIQnNaU0JTYjI5MElFTkJJQzBnUnpNeEpqQWtCZ05WQkFzTUhVRndjR3hsSUVObGNuUnBabWxqWVhScGIyNGdRWFYwYUc5eWFYUjVNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVFzd0NRWURWUVFHRXdKVlV6QjJNQkFHQnlxR1NNNDlBZ0VHQlN1QkJBQWlBMklBQkpqcEx6MUFjcVR0a3lKeWdSTWMzUkNWOGNXalRuSGNGQmJaRHVXbUJTcDNaSHRmVGpqVHV4eEV0WC8xSDdZeVlsM0o2WVJiVHpCUEVWb0EvVmhZREtYMUR5eE5CMGNUZGRxWGw1ZHZNVnp0SzUxN0lEdll1VlRaWHBta09sRUtNYU5DTUVBd0hRWURWUjBPQkJZRUZMdXczcUZZTTRpYXBJcVozcjY5NjYvYXl5U3JNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdEZ1lEVlIwUEFRSC9CQVFEQWdFR01Bb0dDQ3FHU000OUJBTURBMmdBTUdVQ01RQ0Q2Y0hFRmw0YVhUUVkyZTN2OUd3T0FFWkx1Tit5UmhIRkQvM21lb3locG12T3dnUFVuUFdUeG5TNGF0K3FJeFVDTUcxbWloREsxQTNVVDgyTlF6NjBpbU9sTTI3amJkb1h0MlFmeUZNbStZaGlkRGtMRjF2TFVhZ002QmdENTZLeUtBPT0iXX0.eyJvcmlnaW5hbFRyYW5zYWN0aW9uSWQiOiIyMDAwMDAwODE2MDcyNDIxIiwiYXV0b1JlbmV3UHJvZHVjdElkIjoibG92ZXB1c2hfbW9udGhseV8xNTAiLCJwcm9kdWN0SWQiOiJsb3ZlcHVzaF9tb250aGx5XzE1MCIsImF1dG9SZW5ld1N0YXR1cyI6MSwicmVuZXdhbFByaWNlIjoxNTAwMDAsImN1cnJlbmN5IjoiVFdEIiwic2lnbmVkRGF0ZSI6MTczNTE4ODQwOTgyNCwiZW52aXJvbm1lbnQiOiJTYW5kYm94IiwicmVjZW50U3Vic2NyaXB0aW9uU3RhcnREYXRlIjoxNzM1MTg4Mzk0MDAwLCJyZW5ld2FsRGF0ZSI6MTczNTE5MTk5NDAwMH0.ASuX5vL0eyIGVYnvD3kLF6rD_9y4idvBCtO6nsxD1gCGi9mQTKMMXzogb1ETZsoGTs5VAbk4NpJLt4VTA3nk5w',
//  status: 1
//   },
//  version: '2.0',
//  signedDate: 1735188409840
//  }
