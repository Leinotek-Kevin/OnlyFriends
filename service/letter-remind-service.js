const cloudMsgService = require("../utils/cloudmsg-util");

//提醒用戶發送紙飛機(每天 12:00 發送)
const runLetterRemind = async () => {
  try {
    const result = await cloudMsgService.sendMsgToTopic("letter-remind", {
      title: "💫 緣分就在眼前，別錯過！",
      body: "一封紙飛機，一段美好的相遇，你的緣分將會是誰呢？🕊️",
      image: "",
      behaviorType: "101",
      navigateSign: "letter",
    });
    console.log("提醒用戶發送紙飛機", result ? "發送成功" : "發送失敗");
  } catch (e) {
    console.log("提醒用戶發送紙飛機", e);
  }
};

runLetterRemind();
