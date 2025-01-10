const sbUtil = require("../utils/sendbird-util");

//提醒午夜新配對要開始了 23:30
const runAlertMatch = async () => {
  try {
    const result = await sbUtil.sendMsgOpenChannel(
      "午夜新配對快要到嚕！",
      "matchAlert"
    );
  } catch (e) {
    console.log("午夜提醒訊息發送失敗", e);
  }
};

runAlertMatch();
