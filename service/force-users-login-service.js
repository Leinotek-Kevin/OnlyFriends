const User = require("../models").user;
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

//設定每天 06:00 執行一次 強制讓假人和官方人員登入
const startForceUserLogin = async () => {
  const now = new Date();

  //06:00
  if (now.getHours() == 6 && now.getMinutes() == 0) {
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

      // 是否為測試環境
      const isDevelop =
        process.env.PORT == 8080 || process.env.HEROKU_ENV == "DEBUG";

      //強制讓假人和官方人員登入
      await User.updateMany(
        {
          identity: { $in: isDevelop ? [0, 1, 2, 3] : [0, 1] }, // identity 為 0 或 1
        },
        { lastLoginTime: Date.now() }
      );

      console.log("已完成強制假人和官方人員登入排程");
    } catch (e) {
      console.log(e);
    }
  }
};

module.exports = startForceUserLogin;
