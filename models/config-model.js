const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作系統配置 Schema
const configSchema = new Schema({
  //聊天室預設背景
  chatCover: {
    type: String,
  },

  //系統配對狀態
  matchScheduleStatus: {
    type: String,
    default: "0",
    enum: ["0", "1", "2"], // 0:準備配對 , 1: 正在配對 , 2:已完成配對
  },
});

//隱藏 _id,__v
configSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Config", configSchema);
