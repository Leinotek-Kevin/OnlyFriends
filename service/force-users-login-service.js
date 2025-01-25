const User = require("../models").user;
const mongoose = require("mongoose");

//強制讓假人和官方人員登入
const runForceUserLogin = async () => {
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

    //強制讓假人和官方人員登入
    await User.updateMany(
      {
        identity: { $in: [0, 1] }, // identity 為 0 或 1
      },
      { lastLoginTime: Date.now() }
    );
  } catch (e) {
    console.log(e);
  }
};

runForceUserLogin();
