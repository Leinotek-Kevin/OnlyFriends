const { google } = require("googleapis");
const { JWT } = google.auth;
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;

//前端回傳的 originalJson
// {"orderId":"GPA.3357-5076-3532-61828","packageName":"com.anonymous.lottoto",
// "productId":"lottoto_monthly_50","purchaseTime":1734928958104,
// "purchaseState":0,"purchaseToken":"dolgljnhbohkplffkgjbcmmh.AO-J1OxKCHFJ9q0zW_9qdOnNVdJ5PBA62Dm450Nz7MVffXdulARLkzpEwG-vxpdCRovY9NXhlunguh5Hbket2fETZZ2CQ-c17YGtYCqY_-IACSgt8ayUB1c",
// "quantity":1,"autoRenewing":true,"acknowledged":false}

//驗證訂閱憑證交易
async function validSubscriptionOrder(
  packageName,
  subscriptionId,
  purchaseToken
) {
  try {
    const isLocal = port == 8080;
    let keyFilePath;

    if (isLocal) {
      //keyFilePath = path.join(__dirname, "../onlyfriends-developer.json"); // 本地開發使用本地憑證文件
      keyFilePath = path.join(__dirname, "../lovepush-google-account.json"); // 本地開發使用本地憑證文件
    } else {
      const serviceAccount = JSON.parse(process.env.GOOGLE_DEVELOPER_ACCOUNT);
      keyFilePath = path.join(__dirname, "temp-google-service-account.json");

      // 寫入臨時檔案
      fs.writeFileSync(keyFilePath, JSON.stringify(serviceAccount));
    }

    const auth = new JWT({
      keyFile: keyFilePath, // 本地開發使用本地憑證文件
      scopes: ["https://www.googleapis.com/auth/androidpublisher"], // 需要的授權範圍
    });

    // 建立 androidpublisher 服務
    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth: auth,
    });

    // 呼叫 Google Play API 驗證訂單
    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    return response.data;
  } catch (error) {
    return null;
  }
}

//確認訂閱訂單成立
async function acknowledgeSubscription(
  packageName,
  subscriptionId,
  purchaseToken
) {
  try {
    const isLocal = port == 8080;
    let keyFilePath;

    if (isLocal) {
      keyFilePath = path.join(__dirname, "../lovepush-google-account.json"); // 本地開發使用本地憑證文件
    } else {
      const serviceAccount = JSON.parse(process.env.LOVEPUSH_SERVICE_ACCOUNT);
      keyFilePath = path.join(__dirname, "temp-google-service-account.json");

      // 寫入臨時檔案
      fs.writeFileSync(keyFilePath, JSON.stringify(serviceAccount));
    }

    const auth = new JWT({
      keyFile: keyFilePath, // 本地開發使用本地憑證文件
      scopes: ["https://www.googleapis.com/auth/androidpublisher"], // 需要的授權範圍
    });

    // 建立 androidpublisher 服務
    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth: auth,
    });

    // 呼叫 Google Play API 驗證訂單
    const response = await androidpublisher.purchases.subscriptions.acknowledge(
      {
        packageName,
        subscriptionId,
        token: purchaseToken,
      }
    );

    return response.data;
  } catch (error) {
    console.log("acknowledgeSubscription", error);
    return null;
  }
}

module.exports = {
  validSubscriptionOrder,
  acknowledgeSubscription,
};

//訂閱狀態變化通知
// {"version":"1.0","packageName":"com.anonymous.ipush","eventTimeMillis":"1734430600990","
// subscriptionNotification":{"version":"1.0","notificationType":4,
// "purchaseToken":"lndfcnmcdjahebbikcnhdokb.AO-J1OwbenosvkJQsvtKKvopSoI6dPP3PezGkK6WskhZFJxZX_WCc9EqHxNcSMKg0EVXAKfKDqElQ0uZeGbjtY6fj8vNgvf3jg",
// "subscriptionId":"lovepush_monthly_150"}}

//退款通知
// {"version":"1.0","packageName":"com.anonymous.ipush","eventTimeMillis":"1734606334093",
// "voidedPurchaseNotification":{"purchaseToken":"klklnbpjbipomjneihfpkegc.AO-J1Oy0pl5D_T4_kjt4UFZPOEQyZdVlpnGrEvGhC998-sTvqZ1w04ZqAVRpTFb9Q38hjUt3bjmTa0FRxtuFyMjr3fJqSgUIvw",
// "orderId":"GPA.3346-3431-2321-61213","productType":1,"refundType":1}}

//驗證結果 {
//    startTimeMillis: '1734608331197',  這是訂閱生效的時間
//    expiryTimeMillis: '1734608632071', 這是訂閱結束的時間
//    autoRenewing: false, 訂閱是否會自動續訂
//    priceCurrencyCode: 'TWD', 訂閱的貨幣代碼
//    priceAmountMicros: '150000000', 訂閱價格，單位是微元（1 微元 = 1,000,000 分之一的貨幣單位）。
//    countryCode: 'TW', 購買訂閱的用戶的國家代碼
//    developerPayload: '',用來存放開發者自定義的資訊
//    paymentState : 1 , 0: 付款處於待處理狀態 , 1:付款已收到 , 2:用戶正在免費試用訂閱 , 3:付款已延遲，稍後會重新嘗試付款
//    cancelReason: 1, 訂閱取消的原因（如果訂閱被取消）。常見的取消原因有：0: 用戶取消。 1: 付款問題（例如信用卡過期）
//    orderId: 'GPA.3373-0997-2970-22735', Google Play 訂單的唯一識別碼
//    purchaseType: 0, 購買的類型 訂閱項目的購買類型。只有在未使用標準應用程式內結帳流程完成購買交易時，才會設定這個欄位。可能的值為 0。測試 (即透過授權測試帳戶購買) 1. 促銷 (即使用促銷代碼購買)
//    acknowledgementState: 0, 訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認
//    kind: 'androidpublisher#subscriptionPurchase' API 返回的對象類型
//  }

//GPA.3357-5076-3532-61828..5 標示該筆訂單續訂5次
