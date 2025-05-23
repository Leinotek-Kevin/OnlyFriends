const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作正在活躍圈圈 Schema
const activityCircleSchema = new Schema({
  //流水編號 ID
  circleID: {
    type: String,
    default: "",
  },
  //圈圈主題ID
  circleTopicID: {
    type: String,
    default: "",
  },

  //圈圈主題名稱
  circleTopicName: {
    type: String,
    default: "",
  },

  //活躍圈圈的 SendBird ChannelID 唯一值
  circleChannelID: {
    type: String,
    default: "",
  },

  //圈圈主題色系
  circleTopicColors: {
    //狀態欄色碼
    statusColor: {
      type: String,
      default: "",
    },

    //多功能欄色碼
    functionColor: {
      type: String,
      default: "",
    },

    //自己訊息色碼
    selfMsgColor: {
      type: String,
      default: "",
    },

    //已讀標記色碼
    readTagColor: {
      type: String,
      default: "",
    },

    //系統時間色碼
    systemTimeColor: {
      type: String,
      default: "",
    },

    //傳送按鈕色碼
    sendBtnColor: {
      type: String,
      default: "",
    },
  },

  //圈圈主題背景
  circleBackground: {
    type: String,
    default: "",
  },

  //圈圈主題 Logo
  circleTopicLogo: {
    type: String,
    default: "",
  },

  //活躍圈圈參加用戶:
  circleUserIDS: {
    type: [{ type: String }],
    default: [],
  },

  //圈圈投票箱
  circleVoteBox: {
    //贊成用戶
    circleAgreeUserIDS: {
      type: [{ type: String }],
      default: [],
    },

    //拒絕用戶
    circleRejectUserIDS: {
      type: [{ type: String }],
      default: [],
    },

    //目前贊成票率
    agreeVoteRate: {
      type: Number,
      default: 0,
    },
  },
});

//隱藏 _id,__v
activityCircleSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("ActivityCircle", activityCircleSchema);
