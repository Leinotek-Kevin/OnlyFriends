const cloudMsgService = require("../utils/cloudmsg-util");
const User = require("../models").user;
const mongoose = require("mongoose");

//檢查 Firebase Device Token 是否存活
const checkDeviceSchedule = async () => {
  //台灣時間
  const now = new Date();

  if (now.getHours() == 5 && now.getMinutes() == 0) {
    try {
      //連結 mongoDB
      mongoose
        .connect(process.env.MONGODB_CONNECTION)
        .then(() => {
          console.log("連結到 mongoDB");
        })
        .catch((e) => {
          console.log(e);
        });

      const hasTokenUsers = await User.find({
        deviceTokens: { $exists: true, $ne: [] }, // 查詢有 deviceTokens 並且不為空陣列的用戶
      });

      if (hasTokenUsers && hasTokenUsers.length > 0) {
        // 使用 Promise.all 並行處理
        await Promise.all(
          hasTokenUsers.map(async (user) => {
            const currents = user.deviceTokens;

            // 發送推播並捕捉錯誤的 tokens
            const errorTokens = await cloudMsgService.sendMsgToCatchError(
              currents
            );

            if (errorTokens && errorTokens.length > 0) {
              // 差集比較，移除 currents 中存在於 errorTokens 的 token
              const validTokens = currents.filter(
                (token) => !errorTokens.includes(token)
              );

              // 批量更新用戶的 deviceTokens
              await User.updateOne(
                { userID: user.userID }, // 更新條件
                { deviceTokens: validTokens } // 更新內容
              );
            }
          })
        );
        console.log("用戶有問題的 Token 已經處理完畢");
      } else {
        console.log("沒有用戶有Token 需要檢查");
      }
    } catch (e) {
      console.log("檢查裝置設備有誤", e);
    }
  }
};

module.exports = checkDeviceSchedule;
