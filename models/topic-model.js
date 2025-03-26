const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作背景主題 Schema
const topicSchema = new Schema({
  //背景主題ID
  topicID: {
    type: String,
  },

  //背景主題方案 F:免費 P:付費
  topicPlan: {
    type: String,
    enum: ["P", "F"],
  },

  //主題背景
  topicBackGround: {
    type: String,
  },

  //背景預覽圖(包含文字)
  topicPreview: {
    type: String,
  },

  //背景縮略圖
  topicThumbnail: {
    type: String,
  },

  //主題色系
  topicColors: {
    //狀態欄色碼
    statusColor: {
      type: String,
    },

    //多功能欄色碼
    functionColor: {
      type: String,
    },

    //自己訊息色碼
    selfMsgColor: {
      type: String,
    },

    //已讀標記色碼
    readTagColor: {
      type: String,
    },

    //系統時間色碼
    systemTimeColor: {
      type: String,
    },

    //傳送按鈕色碼
    sendBtnColor: {
      type: String,
    },
  },

  //背景主題優先序
  priority: {
    type: Number,
  },

  //是否可以使用
  topicAvailable: {
    type: Boolean,
    default: true,
  },
});

topicSchema.index({ priority: -1 });

//隱藏 _id,__v
topicSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Topic", topicSchema);
