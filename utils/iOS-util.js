const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;
const fs = require("fs");
const path = require("path");
const generalUtil = require("./general-util");

const APPLE_PRODUCTION_URL =
  "https://api.storekit.itunes.apple.com/inApps/v1/transactions/";
const APPLE_SANDBOX_URL =
  "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/";
const SHARED_SECRET = process.env.iOS_SHARED_KEY;

async function generateAppleJWT() {
  const privateKeyPath = path.join(__dirname, "../AuthKey.p8");
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

  const token = jwt.sign(
    {
      iss: "82fb0e4e-5037-479a-8ee0-f69995fd2bc8", // Apple Team ID
      iat: Math.floor(Date.now() / 1000), // 發行時間
      exp: Math.floor(Date.now() / 1000) + 60 * 3, // 設定過期時間，3 分鐘後過期
      aud: "appstoreconnect-v1", // Audience 固定為這個值
      bid: "com.leinotek.LovePush", // App bundle ID
    },
    privateKey,
    {
      algorithm: "ES256", // Apple 使用 ES256 加密算法
      keyid: "V64KGQSL8Q", //API Key ID
    }
  );

  console.log("Apple JWT :", token);
  return token;
}

//獲取交易訊息
async function getTranscationInfo() {
  try {
    let requestUrl = port == 8080 ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;

    const jwtToken = await generateAppleJWT();

    let url = requestUrl + "2000000815714769";

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      }, // headers 應放在同一個配置對象裡
    });

    if (response && response.data) {
      let { signedTransactionInfo } = response.data;
      const transcationInfo = generalUtil.decodeSignInfoByJWT(
        signedTransactionInfo
      );
    }

    return response;
  } catch (error) {
    console.log(error);
    return null;
  }
}

//解析交易通知訊息
const anaTransNotification = (signedPayload) => {
  try {
    let notificationInfo = jwt.decode(signedPayload, {
      complete: false,
    });

    const { signedTransactionInfo, signedRenewalInfo } = notificationInfo.data;

    if (signedTransactionInfo) {
      delete notificationInfo.data.signedTransactionInfo;
      notificationInfo.transactionInfo = generalUtil.decodeSignInfoByJWT(
        signedTransactionInfo
      );
    }

    if (signedRenewalInfo) {
      delete notificationInfo.data.signedRenewalInfo;
      notificationInfo.renewalInfo =
        generalUtil.decodeSignInfoByJWT(signedRenewalInfo);
    }
    return notificationInfo;
  } catch (e) {
    return;
  }
};

module.exports = {
  generateAppleJWT,
  anaTransNotification,
};

// TransactionInfo {
//   transactionId: '2000000815714769', 交易的唯一識別碼 , 識別這筆交易，通常用來查詢交易狀態或進行退款等操作
//   originalTransactionId: '2000000815714769',原始交易的識別碼 ,對於自動續訂訂閱，這個 ID 表示最初的訂閱交易 ID。如果是續訂交易，這將是原始訂閱的 ID。
//   webOrderLineItemId: '2000000084814497', 識別該訂單行項的 ID ,在某些情況下，這可用來區分不同的購買項目
//   bundleId: 'com.leinotek.LovePush', 應用程序的唯一識別符
//   productId: 'lovepush_monthly_150', 購買的產品或訂閱的唯一識別碼
//   subscriptionGroupIdentifier: '21518152', 訂閱組的識別符 / 在管理多個訂閱計劃時，這個 ID 會幫助將相似的訂閱組織在一起。它用於區分不同的訂閱計劃
//   purchaseDate: 1735121931000, 購買的時間戳 / 表示該交易的發生時間，通常是當用戶進行購買的時間
//   originalPurchaseDate: 1735121931000,原始購買時間戳 / 對於續訂的訂閱，這個欄位顯示的是最初訂閱的購買時間
//   expiresDate: 1735122111000, 訂閱過期時間戳 / 表示訂閱的有效期結束時間，這是自動續訂訂閱過期的時間
//   quantity: 1, 訂閱的數量
//   type: 'Auto-Renewable Subscription', 購買的類型 / 表示該訂單的類型。這裡顯示的是 Auto-Renewable Subscription，表明這是自動續訂的訂閱。
//   inAppOwnershipType: 'PURCHASED', 指示訂閱的擁有權類型 / PURCHASED 值表示用戶已成功購買了該訂閱
//   signedDate: 1735131009669, 簽署的時間戳 / 表示該交易發生或簽署的時間
//   environment: 'Sandbox',表示交易的環境 / Sandbox 表示該交易發生在沙箱環境中
//   transactionReason: 'PURCHASE',該交易的原因 / 通常是 PURCHASE 或其他相關狀況，表明該交易是一次購買操作
//   storefront: 'TWN',顯示交易的商店地點 / TWN 表示交易來自台灣地區
//   storefrontId: '143470',商店的唯一識別符 / 143470 是台灣區的商店識別符
//   price: 150000, 商品或訂閱的價格 / 150000 表示價格為 150 TWD，即 150 新台幣，注意它是以最小貨幣單位（分）表示的，所以要除以 100 來得到實際的金額
//   currency: 'TWD' 交易所使用的貨幣類型 / TWD 表示使用的貨幣是新台幣
// }
