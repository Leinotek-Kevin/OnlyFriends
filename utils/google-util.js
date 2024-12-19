const { google } = require("googleapis");
const axios = require("axios");
const path = require("path");

// //載入服務帳戶的 JSON 憑證檔案
// const serviceAccountKeyFile = path.join(
//   //__dirname :輸出當前的 foler
//   __dirname,
//   "../lovepush-google-account.json"
// ); // 替換為你的 JSON 檔案路徑

// //取得 Google OAuth Token
// async function getAccessToken() {
//   const auth = new google.auth.GoogleAuth({
//     keyFile: serviceAccountKeyFile,
//     scopes: ["https://www.googleapis.com/auth/androidpublisher"], // Google Play API 的權限範圍
//   });

//   // 使用授權的 client 獲取 access token
//   const client = await auth.getClient();
//   const accessToken = await client.getAccessToken();

//   console.log("OAuth Token", accessToken);
//   return accessToken;
// }

// async function verifySubPurchase(packageName, subscriptionId, purchaseToken) {
//   const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;

//   try {
//     const accessToken = getAccessToken();
//     const response = await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     });
//     // response.data 會包含購買的詳細信息
//     console.log(response.data);
//     return response.data;
//   } catch (e) {
//     console.error("Error Verifying Purchase:", e);
//     return null;
//   }
// }

// verifySubPurchase(
//   "com.anonymous.ipush",
//   "lovepush_monthly_150",
//   "lndfcnmcdjahebbikcnhdokb.AO-J1OwbenosvkJQsvtKKvopSoI6dPP3PezGkK6WskhZFJxZX_WCc9EqHxNcSMKg0EVXAKfKDqElQ0uZeGbjtY6fj8vNgvf3jg"
// );

// 使用你下載的服務帳戶 JSON 憑證
const keyFilePath = path.join(__dirname, "../lovepush-google-account.json");

// 包含應用程序的 package name, subscription id, 和購買 token
const packageName = "com.anonymous.ipush"; // 你的應用包名
const subscriptionId = "lovepush_monthly_150"; // 訂閱 ID
const token =
  "lndfcnmcdjahebbikcnhdokb.AO-J1OwbenosvkJQsvtKKvopSoI6dPP3PezGkK6WskhZFJxZX_WCc9EqHxNcSMKg0EVXAKfKDqElQ0uZeGbjtY6fj8vNgvf3jg"; // 客戶購買時返回的 token

async function authenticateAndVerifySubscription() {
  try {
    // 設置認證
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    // 獲取客戶端
    const authClient = await auth.getClient();

    // 初始化 Android Publisher API 客戶端
    const playDeveloperApi = google.androidpublisher({
      version: "v3",
      auth: authClient,
    });

    // 調用驗證訂閱的 API
    const response = await playDeveloperApi.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: subscriptionId,
      token: token,
    });

    // 處理返回的訂閱驗證結果
    if (response.data && response.data.purchaseState === 0) {
      console.log("訂閱驗證成功:", response.data);
    } else {
      console.log("訂閱驗證失敗或無效:", response.data);
    }
  } catch (error) {
    console.error("訂閱驗證時發生錯誤:", error);
  }
}

// 調用驗證函數
authenticateAndVerifySubscription();

// module.exports = { getAccessToken };
