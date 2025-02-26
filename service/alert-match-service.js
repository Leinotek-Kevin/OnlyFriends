const cloudStore = require("../utils/cloudStore-util");

//提醒午夜新配對要開始了 23:30
const runAlertMatch = async () => {
  try {
    const result = await cloudStore.addMessage({
      customType: "matchAlert",
      msg: "午夜新配對快要到嚕！",
      link: "",
      image: "",
    });
    console.log("午夜新配對快要到嚕！", result ? "發送完畢" : "發送有問題");
  } catch (e) {
    console.log("午夜提醒訊息發送失敗", e);
  }
};

runAlertMatch();
