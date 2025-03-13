const dotenv = require("dotenv");
dotenv.config();

//一般配對 00:00
const generalMatch = require("./general-match-service");
//樹洞配對 03:00
const letterMatch = require("./letter-match-service");
//檢查設備Token是否存活 05:00
const checkDevice = require("./check-deivce-service");
//強制登入排程 06:00
const forceLogin = require("./force-users-login-service");
//提醒用戶查看今天的配對 08:00
const matchRemind = require("./general-match-remind-service");
//提醒用戶發送紙飛機 12:00
const letterRemind = require("./letter-remind-service");
//提醒還沒上線的用戶上線 19:00
const userBackRemind = require("./user-back-remind-service");
//提醒午夜配對 23:30
const alertMatch = require("./alert-match-service");

//設定每天執行
const startFetching = () => {
  generalMatch();
  letterMatch();
  checkDevice();
  alertMatch();
  forceLogin();
  matchRemind();
  letterRemind();
  userBackRemind();
};

//每分鐘檢查一次
if (process.env.HEROKU_ENV !== "DEBUG") {
  console.log("正式站啟動定時服務");
  setInterval(startFetching, 60 * 1000);
} else {
  console.log("開發站啟動定時服務");
  setInterval(startFetching, 60 * 1000);
}
