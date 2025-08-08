const router = require("express").Router();
const googleUtil = require("../utils/google-util");
const iOSUtil = require("../utils/iOS-util");
const datelUtil = require("../utils/date-util");
const User = require("../models").user;
const Transcation = require("../models").transcation;

//Google
router.post("/google-purchase", async (req, res) => {
  try {
    const { message } = req.body;
    let decodeMsg = "";

    if (message && message.data) {
      decodeMsg = Buffer.from(message.data, "base64").toString("utf-8");
    }

    let notification = JSON.parse(decodeMsg);

    //console.log("Google 訂單通知類型:", notification);

    //確認是否是現在用戶的訂閱訂單
    const { subscriptionNotification, voidedPurchaseNotification } =
      notification;

    //訂閱訂單狀態變化通知
    if (subscriptionNotification) {
      let {
        packageName,
        subscriptionNotification: {
          purchaseToken,
          subscriptionId,
          notificationType,
        },
      } = notification;

      //驗證 Google 訂單
      const orderInfo = await googleUtil.validSubscriptionOrder(
        packageName,
        subscriptionId,
        purchaseToken
      );

      // console.log("Google 訂單資訊:", JSON.stringify(orderInfo));

      //訂單備註追蹤
      let transcationMemo;
      let orderStatus;

      // 追蹤目前訂單狀態
      switch (notificationType) {
        case 1:
          transcationMemo =
            "訂閱項目已從帳戶保留狀態恢復 :SUBSCRIPTION_RECOVERED (1)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 2:
          transcationMemo = "訂閱已續訂:SUBSCRIPTION_RENEWED (2)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 3:
          transcationMemo = "自願或非自願取消訂閱: SUBSCRIPTION_CANCELED  (3)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 4:
          transcationMemo =
            "使用者已購買新的訂閱項目:SUBSCRIPTION_PURCHASED (4)";
          orderStatus = "active";
          break;
        case 5:
          transcationMemo =
            "訂閱項目已進入帳戶保留狀態: SUBSCRIPTION_ON_HOLD (5)";
          //訂閱不可存取
          orderStatus = "account_hold";
          break;
        case 6:
          //訂閱可存取 paymentState = 0
          transcationMemo =
            "訂閱項目已進入寬限期:SUBSCRIPTION_IN_GRACE_PERIOD (6)";
          orderStatus = "grace_period";
          break;
        case 7:
          transcationMemo =
            "使用者已從「Play」>「帳戶」>「訂閱」還原訂閱項目。訂閱項目已取消，但在使用者還原時尚未到期: SUBSCRIPTION_RESTARTED (7)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 8:
          transcationMemo =
            "使用者已成功確認訂閱項目價格異動:  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED (8)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 9:
          transcationMemo =
            "訂閱項目的週期時間已延長:SUBSCRIPTION_DEFERRED (9)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 10:
          transcationMemo = "訂閱項目已暫停: SUBSCRIPTION_PAUSED (10) ";
          //訂閱不可存取
          orderStatus = "paused";
          break;
        case 11:
          transcationMemo =
            "訂閱暫停時間表已變更 : SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED (11)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 12:
          transcationMemo =
            "使用者在訂閱到期前已取消訂閱項目:SUBSCRIPTION_REVOKED (12)";
          //訂閱可存取
          orderStatus = "active";
          break;
        case 13:
          transcationMemo = "訂閱項目已到期:SUBSCRIPTION_EXPIRED (13)";
          //訂閱不可存取
          orderStatus = "expired";
          break;
        case 20:
          transcationMemo =
            "未完成交易被取消 : SUBSCRIPTION_PENDING_PURCHASE_CANCELED (20)";
          //訂閱不可存取
          orderStatus = "canceled";
          break;

        default:
          transcationMemo = `其他類型的通知${notificationType}`;
          orderStatus = "other";
          break;
      }

      //是否允許存取訂閱項目
      let isAllow = isSubscriptionActive(orderStatus);

      //更新或建立這筆訂閱訂單
      const transcation = await Transcation.findOne({
        transactionID: orderInfo.orderId,
      });

      //目前使用者的 ID
      let currentUserID;

      if (transcation) {
        //如果該筆訂單存在,則更新目前訂單資訊
        const { userID } = transcation;
        currentUserID = userID;

        //如果該筆訂單存在,則更新目前訂單資訊
        await Transcation.updateOne(
          { transactionID: orderInfo.orderId },
          {
            startDate: orderInfo.startTimeMillis,
            expiresDate: orderInfo.expiryTimeMillis,
            autoRenewStatus: orderInfo.autoRenewing,
            paymentState: orderInfo.paymentState,
            acknowledgementState: orderInfo.acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認,
            status: orderStatus,
            transcationMemo,
            isAllow,
            statusUpdateTime: Date.now(),
          }
        );
      } else {
        //這筆動態訂單的 originalTransactionID
        const originalTransactionID = orderInfo.orderId.split("..")[0];

        //如果該筆訂單不存在,則查找這筆訂單的 originalTransactionID , 將資料轉給要建立的訂單資料
        const oriTranscation = await Transcation.findOne({
          originalTransactionID,
        });

        if (oriTranscation) {
          const { userID } = oriTranscation;
          currentUserID = userID;

          //建立新的訂閱訂單資料
          await Transcation.create({
            originalTransactionID,
            transactionID: orderInfo.orderId,
            osType: "0",
            userID: oriTranscation.userID,
            userEmail: oriTranscation.userEmail,
            productID: subscriptionId,
            productType: "0",
            price: Number(orderInfo.priceAmountMicros) / 1000000,
            currency: orderInfo.priceCurrencyCode,
            startDate: orderInfo.startTimeMillis,
            expiresDate: orderInfo.expiryTimeMillis,
            autoRenewStatus: orderInfo.autoRenewing,
            paymentState: orderInfo.paymentState,
            acknowledgementState: orderInfo.acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認,
            status: orderStatus,
            transcationMemo,
            isAllow,
            statusUpdateTime: Date.now(),
          });
        }
      }

      //檢查並更新用戶的訂閱狀態
      checkAndUpdateUserSub(currentUserID, {
        subTranscationID: orderInfo.orderId,
        subExpiresDate: orderInfo.expiryTimeMillis,
        subAutoRenew: orderInfo.autoRenewing,
        isSubscription: isAllow,
      });
    } else if (voidedPurchaseNotification) {
      //根據 refundType來判斷退款的原因及處理
      let {
        voidedPurchaseNotification: { orderId, refundType },
      } = notification;

      let transcationMemo =
        refundType == "2"
          ? "REFUND_TYPE_FULL_REFUND (2) 交易已完全作廢"
          : "REFUND_TYPE_QUANTITY_BASED_PARTIAL_REFUND 購買的商品遭到部分商品退款";

      const transcation = await Transcation.findOne({
        transactionID: orderId,
      });

      if (transcation) {
        //目前使用者的ID
        let currentUserID;

        //如果該筆訂單存在,則更新目前訂單資訊
        const { userID } = transcation;
        currentUserID = userID;

        //如果該筆訂單存在,則更新目前訂單資訊
        await Transcation.updateOne(
          { transactionID: orderId },
          {
            status: "refund",
            transcationMemo,
            isAllow: false,
            statusUpdateTime: Date.now(),
          }
        );

        // 檢查並更新用戶的訂閱狀態
        checkAndUpdateUserSub(currentUserID, {
          subTranscationID: transcation.transactionID,
          subExpiresDate: transcation.expiresDate,
          subAutoRenew: transcation.autoRenewStatus,
          isSubscription: transcation.isAllow,
        });
      }
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
      const { notificationType, subtype, data } = notificationInfo;
      const { transactionInfo, renewalInfo } = data;

      // console.log(
      //   "iOS 訂單通知類型:",
      //   `notificationType : ${notificationType} , subtype : ${subtype} transactionId : ${transactionInfo.transactionId}`
      // );

      const transactionID = transactionInfo.transactionId;
      const originalTransactionID = transactionInfo.originalTransactionId;
      const productID = transactionInfo.productId;
      const startDate = transactionInfo.purchaseDate;
      const expiresDate = transactionInfo.expiresDate;
      const autoRenewStatus = renewalInfo.autoRenewStatus === 1;
      const transcationMemo = `notificationType : ${notificationType} , subtype : ${subtype}`;
      const now = Date.now();

      // 訂閱訂單資料
      let subscription = {
        transactionID,
        productID,
        startDate,
        expiresDate,
        autoRenewStatus,
        transcationMemo,
        statusUpdateTime: Date.now(),
      };

      //處理通知可能的事件
      switch (notificationType) {
        //SUBSCRIBED 事件 (訂閱購買)
        case "SUBSCRIBED":
          if (subtype === "RESUBSCRIBE") {
            subscription.status = "active";
          }
          break;
        //DID_RENEW 事件 (訂閱續訂)
        case "DID_RENEW":
          subscription.status = "active";
          subscription.expiresDate = expiresDate;
          break;

        //DID_CHANGE_RENEWAL_STATUS  用戶改變了訂閱的自動續訂狀態
        case "DID_CHANGE_RENEWAL_STATUS":
          if (autoRenewStatus) {
            subscription.autoRenewStatus = true;
          } else {
            subscription.autoRenewStatus = false;
          }
          subscription.status = "active";
          break;

        //DID_FAIL_TO_RENEW 事件 (續訂失敗)
        case "DID_FAIL_TO_RENEW":
          if (expiresDate > now) {
            subscription.status = "grace_period";
          } else {
            subscription.status = "expired";
          }
          break;

        //EXPIRED 事件 (訂閱過期)
        case "EXPIRED":
          subscription.status = "expired";
          break;

        // GRACE_PERIOD_EXPIRED 事件 (寬限期過期)
        case "GRACE_PERIOD_EXPIRED":
          subscription.status = "expired";
          break;

        //REFUND 事件 (退款)
        case "REFUND":
          subscription.status = "refunded";
          break;

        //DID_CHANGE_RENEWAL_PREF (更改了自動續訂偏好) 通常是升降級方案
        case "DID_CHANGE_RENEWAL_PREF":
          if (subtype === "UPGRADE") {
            subscription.status = "upgraded";
            subscription.productID = renewalInfo.autoRenewProductId;
          } else if (subtype === "DOWNGRADE") {
            subscription.status = "downgraded";
            subscription.productID = renewalInfo.autoRenewProductId;
          }
          break;

        //REVOKE 事件 (撤銷訂閱)
        case "REVOKE":
          // 更新訂閱狀態
          subscription.status = "revoked";
          subscription.expiresDate = expiresDate || Date.now();
          break;
      }

      //判斷這筆訂單是否可以訂閱
      subscription.isAllow = isSubscriptionActive(subscription.status);

      //更新或建立這筆訂閱訂單
      const transcation = await Transcation.findOne({ transactionID });

      let currentUserID;

      if (transcation) {
        const { userID } = transcation;
        currentUserID = userID;

        //如果該筆訂單存在,則更新目前訂單資訊
        await Transcation.updateOne(
          { transactionID },
          {
            $set: subscription,
          }
        );
      } else {
        //如果該筆訂單不存在,則查找這筆訂單的 originalTransactionID , 將資料轉給要建立的訂單資料
        const oriTranscation = await Transcation.findOne({
          originalTransactionID,
        });

        if (oriTranscation) {
          const { userID } = oriTranscation;
          currentUserID = userID;

          //建立新的訂閱訂單資料
          await Transcation.create({
            originalTransactionID: oriTranscation.originalTransactionID,
            transactionID: subscription.transactionID,
            productID: subscription.productID,
            productType: oriTranscation.productType,
            price: oriTranscation.price,
            currency: oriTranscation.currency,
            transcationMemo: subscription.transcationMemo,
            purchaseDate: oriTranscation.purchaseDate,
            autoRenewStatus: subscription.autoRenewStatus,
            startDate: subscription.startDate,
            expiresDate: subscription.expiresDate,
            userID: oriTranscation.userID,
            userEmail: oriTranscation.userEmail,
            osType: "1",
            isAllow: subscription.isAllow,
            status: subscription.status,
            statusUpdateTime: subscription.statusUpdateTime,
          });
        }
      }

      // 檢查並更新用戶的訂閱狀態
      checkAndUpdateUserSub(currentUserID, {
        subTranscationID: subscription.transactionID,
        subExpiresDate: subscription.expiresDate,
        subAutoRenew: subscription.autoRenewStatus,
        isSubscription: subscription.isAllow,
      });
    }

    return res.status(200).send({
      status: true,
      message: notificationInfo
        ? "iOS 購買信息處理完成"
        : "iOS 購買信息處理失敗",
    });
  } catch (e) {
    return res.status(200).send({
      status: false,
      message: "Server Error!",
      e,
    });
  }
});

//檢查用戶是否有訂閱權
async function checkAndUpdateUserSub(userID, transactionInfo) {
  if (userID) {
    let updateData = {
      subTranscationID: transactionInfo.subTranscationID,
      subExpiresDate: datelUtil.formatTimestamp(transactionInfo.subExpiresDate),
      subAutoRenew: transactionInfo.subAutoRenew,
      isSubscription: transactionInfo.isSubscription,
    };

    if (!transactionInfo.isSubscription) {
      // 如果用戶沒有訂閱，將期望對象地區改為預設
      updateData["objectCondition.objectRegion"] = "";
      // 如果用戶沒有訂閱，將期望共同興趣改為 false
      updateData["objectCondition.needSameInterested"] = false;
    }

    //更改用戶訂閱狀態
    await User.updateOne(
      { userID },
      {
        $set: updateData,
      }
    );
  }
}

//這個訂閱訂單是否可以訂閱
function isSubscriptionActive(currentStatus) {
  // console.log("該筆訂單的檢查狀態", currentStatus);

  const allowedStatuses = [
    "active",
    "grace_period",
    "pending_renewal",
    "upgraded",
    "downgraded",
  ];

  // 檢查訂閱的狀態是否在允許的狀態清單中
  if (allowedStatuses.includes(currentStatus)) {
    return true;
  }

  // 其他狀態表示訂閱無效
  return false;
}

module.exports = router;

//iOS-past
// router.post("/iOS-purchase", async (req, res) => {
//   try {
//     const notificationInfo = iOSUtil.anaTransNotification(
//       req.body.signedPayload
//     );

//     if (notificationInfo) {
//       const { notificationType, subtype, data } = notificationInfo;
//       const { transactionInfo, renewalInfo } = data;

//       console.log(
//         "iOS 訂單通知類型:",
//         `notificationType : ${notificationType} , subtype : ${subtype} transactionId : ${transactionInfo.transactionId}`
//       );

//       const transactionID = transactionInfo.transactionId;
//       const originalTransactionID = transactionInfo.originalTransactionId;
//       const productID = transactionInfo.productId;
//       const expiresDate = transactionInfo.expiresDate;
//       const autoRenewStatus = renewalInfo.autoRenewStatus === 1;
//       const transcationMemo = `notificationType : ${notificationType} , subtype : ${subtype}`;
//       const now = Date.now();

//       // 查找或創建訂閱
//       let subscription = await Transcation.findOne({ originalTransactionID });

//       if (subscription) {
//         // 更新訂閱信息
//         subscription.transactionID = transactionID;
//         subscription.productID = productID;
//         subscription.expiresDate = expiresDate;
//         subscription.autoRenewStatus = autoRenewStatus;
//         subscription.transcationMemo = transcationMemo;
//         subscription.statusUpdateTime = Date.now();

//         //處理通知可能的事件
//         switch (notificationType) {
//           //SUBSCRIBED 事件 (訂閱購買)
//           case "SUBSCRIBED":
//             if (subtype === "RESUBSCRIBE") {
//               subscription.status = "active";
//             }
//             break;
//           //DID_RENEW 事件 (訂閱續訂)
//           case "DID_RENEW":
//             subscription.status = "active";
//             subscription.expiresDate = expiresDate;
//             break;

//           //DID_CHANGE_RENEWAL_STATUS  用戶改變了訂閱的自動續訂狀態
//           case "DID_CHANGE_RENEWAL_STATUS":
//             if (autoRenewStatus) {
//               subscription.autoRenewStatus = true;
//             } else {
//               subscription.autoRenewStatus = false;
//             }
//             subscription.status = "active";
//             break;

//           //DID_FAIL_TO_RENEW 事件 (續訂失敗)
//           case "DID_FAIL_TO_RENEW":
//             if (expiresDate > now) {
//               subscription.status = "grace_period";
//             } else {
//               subscription.status = "expired";
//             }
//             break;

//           //EXPIRED 事件 (訂閱過期)
//           case "EXPIRED":
//             subscription.status = "expired";
//             break;

//           // GRACE_PERIOD_EXPIRED 事件 (寬限期過期)
//           case "GRACE_PERIOD_EXPIRED":
//             subscription.status = "expired";
//             break;

//           //REFUND 事件 (退款)
//           case "REFUND":
//             subscription.status = "refunded";
//             break;

//           //DID_CHANGE_RENEWAL_PREF (更改了自動續訂偏好) 通常是升降級方案
//           case "DID_CHANGE_RENEWAL_PREF":
//             if (subtype === "UPGRADE") {
//               subscription.status = "upgraded";
//               subscription.productID = renewalInfo.autoRenewProductId;
//             } else if (subtype === "DOWNGRADE") {
//               subscription.status = "downgraded";
//               subscription.productID = renewalInfo.autoRenewProductId;
//             }
//             break;

//           //REVOKE 事件 (撤銷訂閱)
//           case "REVOKE":
//             // 更新訂閱狀態
//             subscription.status = "revoked";
//             subscription.expiresDate = expiresDate || Date.now();
//             break;
//         }

//         //判斷這筆訂單能否允許
//         subscription.isAllow = isSubscriptionActive(subscription.status);

//         // 儲存訂閱狀態
//         await subscription.save();

//         // 檢查並更新用戶的訂閱狀態
//         let { userID } = subscription;

//         //檢查用戶是否有訂閱權
//         checkAllowSubscription(userID);
//       }
//     }

//     return res.status(200).send({
//       status: true,
//       message: notificationInfo
//         ? "iOS 購買信息處理完成"
//         : "iOS 購買信息處理失敗",
//     });
//   } catch (e) {
//     return res.status(200).send({
//       status: false,
//       message: "Server Error!",
//       e,
//     });
//   }
// });

//Google-past
// router.post("/google-purchase", async (req, res) => {
//   try {
//     const { message } = req.body;
//     let decodeMsg = "";

//     if (message && message.data) {
//       decodeMsg = Buffer.from(message.data, "base64").toString("utf-8");
//     }

//     let notification = JSON.parse(decodeMsg);

//     console.log("Google 訂單通知類型:", notification);

//     //確認是否是現在用戶的訂閱訂單
//     const { subscriptionNotification, voidedPurchaseNotification } =
//       notification;

//     //訂閱訂單狀態變化通知
//     if (subscriptionNotification) {
//       let {
//         packageName,
//         subscriptionNotification: {
//           purchaseToken,
//           subscriptionId,
//           notificationType,
//         },
//       } = notification;

//       //驗證 Google 訂單
//       const orderInfo = await googleUtil.validSubscriptionOrder(
//         packageName,
//         subscriptionId,
//         purchaseToken
//       );

//       console.log("Google 訂單資訊:", JSON.stringify(orderInfo));

//       //訂單備註追蹤
//       let transcationMemo;
//       let orderStatus;

//       // 追蹤目前訂單狀態
//       switch (notificationType) {
//         case 1:
//           transcationMemo =
//             "訂閱項目已從帳戶保留狀態恢復 :SUBSCRIPTION_RECOVERED (1)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 2:
//           transcationMemo = "訂閱已續訂:SUBSCRIPTION_RENEWED (2)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 3:
//           transcationMemo = "自願或非自願取消訂閱: SUBSCRIPTION_CANCELED  (3)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 4:
//           transcationMemo =
//             "使用者已購買新的訂閱項目:SUBSCRIPTION_PURCHASED (4)";
//           orderStatus = "active";
//           break;
//         case 5:
//           transcationMemo =
//             "訂閱項目已進入帳戶保留狀態: SUBSCRIPTION_ON_HOLD (5)";
//           //訂閱不可存取
//           orderStatus = "account_hold";
//           break;
//         case 6:
//           //訂閱可存取 paymentState = 0
//           transcationMemo =
//             "訂閱項目已進入寬限期:SUBSCRIPTION_IN_GRACE_PERIOD (6)";
//           orderStatus = "grace_period";
//           break;
//         case 7:
//           transcationMemo =
//             "使用者已從「Play」>「帳戶」>「訂閱」還原訂閱項目。訂閱項目已取消，但在使用者還原時尚未到期: SUBSCRIPTION_RESTARTED (7)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 8:
//           transcationMemo =
//             "使用者已成功確認訂閱項目價格異動:  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED (8)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 9:
//           transcationMemo =
//             "訂閱項目的週期時間已延長:SUBSCRIPTION_DEFERRED (9)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 10:
//           transcationMemo = "訂閱項目已暫停: SUBSCRIPTION_PAUSED (10) ";
//           //訂閱不可存取
//           orderStatus = "paused";
//           break;
//         case 11:
//           transcationMemo =
//             "訂閱暫停時間表已變更 : SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED (11)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 12:
//           transcationMemo =
//             "使用者在訂閱到期前已取消訂閱項目:SUBSCRIPTION_REVOKED (12)";
//           //訂閱可存取
//           orderStatus = "active";
//           break;
//         case 13:
//           transcationMemo = "訂閱項目已到期:SUBSCRIPTION_EXPIRED (13)";
//           //訂閱不可存取
//           orderStatus = "expired";
//           break;
//         case 20:
//           transcationMemo =
//             "未完成交易被取消 : SUBSCRIPTION_PENDING_PURCHASE_CANCELED (20)";
//           //訂閱不可存取
//           orderStatus = "canceled";
//           break;

//         default:
//           transcationMemo = `其他類型的通知${notificationType}`;
//           orderStatus = "other";
//           break;
//       }

//       //是否允許存取訂閱項目
//       let isAllow = isSubscriptionActive(orderStatus);

//       //真正的訂單id
//       const realOrderID = orderInfo.orderId.split("..")[0];
//       paymentState = orderInfo.paymentState ? orderInfo.paymentState : "";

//       //找尋資料庫用戶的訂單
//       const currentOrder = await Transcation.findOne({
//         transactionID: realOrderID,
//       });

//       let userID = currentOrder ? currentOrder.userID : "";
//       let userEmail = currentOrder ? currentOrder.userEmail : "";

//       //更新該筆訂單的狀態
//       const data = await Transcation.findOneAndUpdate(
//         { transactionID: realOrderID },
//         {
//           osType: "0",
//           userID,
//           userEmail,
//           productID: subscriptionId,
//           productType: "0",
//           price: Number(orderInfo.priceAmountMicros) / 1000000,
//           currency: orderInfo.priceCurrencyCode,
//           expiresDate: orderInfo.expiryTimeMillis,
//           autoRenewStatus: orderInfo.autoRenewing,
//           paymentState: orderInfo.paymentState,
//           acknowledgementState: orderInfo.acknowledgementState, //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認,
//           status: orderStatus,
//           transcationMemo,
//           isAllow,
//           statusUpdateTime: Date.now(),
//         },
//         {
//           upsert: true,
//           new: true,
//         }
//       );

//       //檢查用戶訂閱狀態
//       checkAllowSubscription(data.userID);
//     } else if (voidedPurchaseNotification) {
//       // 根據 refundType來判斷退款的原因及處理
//       let {
//         voidedPurchaseNotification: { orderId, refundType },
//       } = notification;

//       let transcationMemo =
//         refundType == "2"
//           ? "REFUND_TYPE_FULL_REFUND (2) 交易已完全作廢"
//           : "REFUND_TYPE_QUANTITY_BASED_PARTIAL_REFUND 購買的商品遭到部分商品退款";

//       //更新訂單狀態
//       const data = await Transcation.findOneAndUpdate(
//         { transactionID: orderId },
//         {
//           status: "refund",
//           transcationMemo,
//           isAllow: false,
//           statusUpdateTime: Date.now(),
//         },
//         {
//           new: true,
//         }
//       );

//       //檢查用戶訂閱狀態
//       checkAllowSubscription(data.userID);
//     }

//     return res.status(200).send({
//       status: true,
//       message: "處理完畢",
//     });
//   } catch (e) {
//     console.log(e);
//     return res.status(500).send({
//       status: false,
//       message: "訂單驗證出現異常！",
//       e,
//     });
//   }
// });

//檢查用戶是否有訂閱權
async function checkAllowSubscription(userID) {
  if (userID) {
    //按照過期時間降冪排序->新到舊
    const lastSubscription = await Transcation.findOne({
      userID,
    })
      .sort({ expiresDate: -1 })
      .limit(1);

    let updateData = {
      subTranscationID: lastSubscription.transactionID,
      subExpiresDate: datelUtil.formatTimestamp(lastSubscription.expiresDate),
      subAutoRenew: lastSubscription.autoRenewStatus,
      isSubscription: lastSubscription.isAllow,
    };

    if (!lastSubscription.isAllow) {
      // 如果用戶沒有訂閱，將期望對象地區改為預設
      updateData["objectCondition.objectRegion"] = "";
      // 如果用戶沒有訂閱，將期望共同興趣改為 false
      updateData["objectCondition.needSameInterested"] = false;
    }

    //更改用戶訂閱狀態
    await User.updateOne(
      { userID },
      {
        $set: updateData,
      }
    );
  }
}

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
