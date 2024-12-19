const { google } = require("googleapis");
const { JWT } = google.auth;
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;

async function validSubscriptionOrder(
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
    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    //console.log("訂單驗證成功:", response.data);

    return response.data;
  } catch (error) {
    // console.error(
    //   "驗證訂單失敗:",
    //   error.response ? error.response.data : error.message
    // );

    return null;
  }
}

//validSubscriptionOrder(PACKAGE_NAME, SUBSCRIPTION_ID, PURCHASE_TOKEN);

module.exports = {
  validSubscriptionOrder,
};
