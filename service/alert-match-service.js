const cloudAnnou = require("../utils/cloudAnnou-util");

//設定每天 23:30 執行一次 提醒用戶午夜配對快要到勒
const startSchedule = async () => {
  const now = new Date();

  if (now.getHours() == 23 && now.getMinutes() == 30) {
    try {
      const result = await cloudAnnou.addAnnouMessage({
        customType: "matchAlert",
        msg: "午夜新配對快要到嚕！",
        link: "",
        image: "",
      });
      console.log("午夜新配對快要到嚕！", result ? "發送完畢" : "發送有問題");
    } catch (e) {
      console.log("午夜提醒訊息發送失敗", e);
    }
  }
};

module.exports = startSchedule;
