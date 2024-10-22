const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 8080;

// 選擇服務帳號憑證
const serviceAccount =
  port == 8080
    ? require("../google-account-key.json") // 本地開發使用本地憑證文件
    : JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS); // 其他環境從環境變數中解析憑證

// 檢查是否已經初始化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin has been initialized.");
} else {
  console.log("Firebase Admin is already initialized.");
}

// 導出 admin 實例，供其他文件使用
module.exports = admin;
