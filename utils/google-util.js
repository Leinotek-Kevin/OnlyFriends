const { google } = require("googleapis");
const axios = require("axios");
const path = require("path");
const { error } = require("console");

//載入服務帳戶的 JSON 憑證檔案
const serviceAccountKeyFile = path.join(
  //__dirname :輸出當前的 foler
  __dirname,
  "../lovepush-google-account.json"
); // 替換為你的 JSON 檔案路徑

//取得 Google OAuth Token
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"], // Google Play API 的權限範圍
  });

  // 使用授權的 client 獲取 access token
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  console.log("OAuth Token", accessToken);
  return accessToken;
}

async function verifySubPurchase(packageName, subscriptionId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;

  try {
    const accessToken = getAccessToken();
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    // response.data 會包含購買的詳細信息
    console.log(response.data);
    return response.data;
  } catch (e) {
    console.error("Error Verifying Purchase:", e);
    return null;
  }
}

verifySubPurchase(
  "com.anonymous.ipush",
  "lovepush_monthly_150",
  "lndfcnmcdjahebbikcnhdokb.AO-J1OwbenosvkJQsvtKKvopSoI6dPP3PezGkK6WskhZFJxZX_WCc9EqHxNcSMKg0EVXAKfKDqElQ0uZeGbjtY6fj8vNgvf3jg"
);

// module.exports = { getAccessToken };
