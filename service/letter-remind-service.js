const cloudMsgService = require("../utils/cloudmsg-util");

//提醒用戶發送紙飛機(每天 12:00 發送)
const letterRemind = async () => {
  const now = new Date();

  if (now.getHours() == 12 && now.getMinutes() == 0) {
    try {
      const topicData = {
        title: "💫 緣分就在眼前，別錯過！",
        body: "一封紙飛機，一段美好的相遇，你的緣分將會是誰呢？🕊️",
        image: "",
        behaviorType: "101",
        navigateSign: "letter",
      };

      await cloudMsgService.sendMsgToAndroidTopic(
        "letter-remind-android",
        topicData
      );
      await cloudMsgService.sendMsgToIOSTopic("letter-remind-iOS", topicData);
    } catch (e) {
      console.log("提醒用戶發送紙飛機", e);
    }
  }
};

module.exports = letterRemind;

// const runLetterRemind = async () => {
//   try {
//     const topicData = {
//       title: "💫 緣分就在眼前，別錯過！",
//       body: "一封紙飛機，一段美好的相遇，你的緣分將會是誰呢？🕊️",
//       image: "",
//       behaviorType: "101",
//       navigateSign: "letter",
//     };

//     await cloudMsgService.sendMsgToAndroidTopic(
//       "letter-remind-android",
//       topicData
//     );
//     await cloudMsgService.sendMsgToIOSTopic("letter-remind-iOS", topicData);
//   } catch (e) {
//     console.log("提醒用戶發送紙飛機", e);
//   }
// };

// runLetterRemind();
