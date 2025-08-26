const User = require("../models").user;
const cloudStorage = require("../utils/cloudStorage-util");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

//刪除已經被標記要刪除的帳號
const startSchedule = async () => {
  //台灣時間
  const now = new Date();

  //凌晨 00 :00 執行刪除帳號排程
  if (now.getHours() == 0 && now.getMinutes() == 0) {
    const RE_MATCH_DELAY = 48 * 60 * 60 * 1000;
    //UNIX 時間
    const time48HoursAgo = Date.now() - RE_MATCH_DELAY; // 計算48小時前的時間點

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

      const lastDeleteAccounts = await User.find({
        deleteAccountTime: { $lt: time48HoursAgo }, // 過去48小時到現在的配對
        userValidCode: "3",
      });

      //要刪除的大頭貼
      let needDeletePhotos = [];
      //要刪除的用戶
      let needDeleteUsers = [];

      for (let i = 0; i < lastDeleteAccounts.length; i++) {
        const user = lastDeleteAccounts[i];

        if (user.userPhotos && user.userPhotos.length > 0) {
          needDeletePhotos.push(...user.userPhotos); // 展開避免巢狀陣列
        }

        needDeleteUsers.push(user.userID);
      }

      // 刪除用戶
      if (needDeleteUsers.length > 0) {
        await User.deleteMany({ userID: { $in: needDeleteUsers } });
      }

      // 刪除大頭貼
      if (needDeletePhotos.length > 0) {
        await cloudStorage.deleteImages(needDeletePhotos);
      }

      console.log("已完成帳號刪除");
    } catch (e) {
      console.log("刪除帳號排程異常！", e);
    }
  }
};

module.exports = startSchedule;
