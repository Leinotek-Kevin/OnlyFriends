const alertMatch = require("./alert-match-service");

//設定每天執行
const startFetching = () => {
  //alertMatch();
  console.log("抓取排程啟動");
};

//部署的時候直接執行一次
if (process.env.HEROKU_ENV !== "DEBUG") {
  console.log("正式站啟動定時服務");
  setInterval(startFetching, 60 * 1000);
} else {
  console.log("開發站不啟動定時服務");
}
