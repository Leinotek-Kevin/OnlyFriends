const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作系統配置 Schema
const configSchema = new Schema({
  //聊天室預設背景
  chatCover: {
    type: String,
  },

  //系統配對紀錄
  matchRecord: {
    //一般配對
    general: {
      //配對狀態
      status: {
        type: String,
        default: "0",
        enum: ["0", "1", "2"], // 0:準備配對 , 1: 正在配對 , 2:已完成配對
      },
      //配對耗時
      consumeTime: {
        type: Number,
        default: 0,
      },
      //配對日期
      currentDate: {
        type: String,
        default: "",
      },
    },

    //樹洞配對
    letter: {
      //配對狀態
      status: {
        type: String,
        default: "0",
        enum: ["0", "1", "2"], // 0:準備配對 , 1: 正在配對 , 2:已完成配對
      },
      //配對耗時
      consumeTime: {
        type: Number,
        default: 0,
      },
      //配對日期
      currentDate: {
        type: String,
        default: "",
      },
    },

    // //系統配對狀態
    // matchScheduleStatus: {
    //   type: String,
    //   default: "0",
    //   enum: ["0", "1", "2"], // 0:準備配對 , 1: 正在配對 , 2:已完成配對
    // },
    // matchScheduleDate: {
    //   type: Date,
    // },
  },

  //系統廣播渠道
  annuChannel: {
    type: String,
    default: "",
  },

  //iOS 系統版本
  iosVersion: {
    name: {
      type: String,
      default: "1.0.0",
    },
    code: {
      type: String,
      default: "1",
    },
  },

  //Android 系統版本
  androidVersion: {
    name: {
      type: String,
      default: "1.0.0",
    },
    code: {
      type: String,
      default: "1",
    },
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
