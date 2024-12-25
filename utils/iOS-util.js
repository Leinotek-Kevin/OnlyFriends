const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;

const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

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
      exp: Math.floor(Date.now() / 1000) + 60 * 10, // 設定過期時間，10 分鐘後過期
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

    const response = await axios.get(requestUrl, {
      params: { transactionId: "2000000815714769" }, // 將 transactionId 作為查詢參數
      headers: { Authorization: `Bearer ${jwtToken}` }, // headers 應放在同一個配置對象裡
    });

    console.log(response);
    return res.json(response);
  } catch (error) {
    console.log(error);
    return null;
  }
}

getTranscationInfo();

// module.exports = {
//   validSubscriptionOrder,
//   generateAppleJWT,
// };

// {
//     "status": 0,
//     "environment": "Sandbox",  // or "Production" depending on the environment
//     "receipt": {
//       "receipt_type": "ProductionSandbox",
//       "adam_id": 0,
//       "app_item_id": 0,
//       "bundle_id": "com.example.app",
//       "application_version": "1.0",
//       "download_id": 0,
//       "version_external_identifier": 0,
//       "receipt_creation_date": "2024-01-01 12:00:00 Etc/GMT",
//       "receipt_creation_date_ms": "1672531200000",
//       "receipt_creation_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//       "request_date": "2024-01-01 12:01:00 Etc/GMT",
//       "request_date_ms": "1672531260000",
//       "request_date_pst": "2024-01-01 04:01:00 America/Los_Angeles",
//       "original_purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//       "original_purchase_date_ms": "1672531200000",
//       "original_purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//       "original_application_version": "1.0",
//       "in_app": [
//         {
//           "quantity": "1",
//           "product_id": "com.example.app.subscription",
//           "transaction_id": "1000000123456789",
//           "original_transaction_id": "1000000123456789",
//           "purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//           "purchase_date_ms": "1672531200000",
//           "purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//           "original_purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//           "original_purchase_date_ms": "1672531200000",
//           "original_purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//           "expires_date": "2024-02-01 12:00:00 Etc/GMT",
//           "expires_date_ms": "1675119600000",
//           "expires_date_pst": "2024-02-01 04:00:00 America/Los_Angeles",
//           "web_order_line_item_id": "1000000123456789",
//           "is_trial_period": "false",
//           "is_in_intro_offer_period": "false"
//         }
//       ]
//     },
//     "latest_receipt_info": [
//       {
//         "quantity": "1",
//         "product_id": "com.example.app.subscription",
//         "transaction_id": "1000000123456789",
//         "original_transaction_id": "1000000123456789",
//         "purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//         "purchase_date_ms": "1672531200000",
//         "purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//         "original_purchase_date": "2024-01-01 12:00:00 Etc/GMT",
//         "original_purchase_date_ms": "1672531200000",
//         "original_purchase_date_pst": "2024-01-01 04:00:00 America/Los_Angeles",
//         "expires_date": "2024-02-01 12:00:00 Etc/GMT",
//         "expires_date_ms": "1675119600000",
//         "expires_date_pst": "2024-02-01 04:00:00 America/Los_Angeles",
//         "web_order_line_item_id": "1000000123456789",
//         "is_trial_period": "false",
//         "is_in_intro_offer_period": "false"
//       }
//     ],
//     "latest_receipt": "base64_receipt_data",
//     "pending_renewal_info": [
//       {
//         "auto_renew_product_id": "com.example.app.subscription",
//         "original_transaction_id": "1000000123456789",
//         "product_id": "com.example.app.subscription",
//         "auto_renew_status": "1"
//       }
//     ]
//   }
