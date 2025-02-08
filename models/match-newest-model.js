const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作本日配對模組 Schema
const matchNewestSchema = new Schema({
  //UI類型
  matchUIType: {
    type: Number,
    enum: [0, 1, 2], //0:OF 團隊 1:一般配對 2:樹洞配對
  },

  //用戶1 ID
  user1ID: {
    type: String,
    required: true,
  },

  //用戶2 ID
  user2ID: {
    type: String,
    required: true,
  },

  //用戶1 資料庫_id
  user1_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  //用戶2 資料庫_id
  user2_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  sendbirdUrl: {
    type: String,
    unique: true,
    default: "",
  },

  isChecked: {
    type: Boolean,
    default: false,
  },

  user1letterContent: {
    type: String,
    default: "",
  },

  user2letterContent: {
    type: String,
    default: "",
  },

  letterMark: {
    type: String,
    default: "",
  },

  //不喜歡這個配對發起者
  unlikeInitiators: {
    type: Array,
    default: [],
  },

  topicID: {
    type: String,
    default: "t-default-00",
  },

  //主題背景
  topicBackGround: {
    type: String,
    default:
      "https://firebasestorage.googleapis.com/v0/b/onlyfriends-20295.appspot.com/o/topic%2Ft-default-00%2Ft-default-00-background.png?alt=media&token=3961662e-d56a-4fa2-b728-168587df0f03",
  },

  //主題色系
  topicColors: {
    //狀態欄色碼
    statusColor: {
      type: String,
      default: "#FFFFFF",
    },

    //多功能欄色碼
    functionColor: {
      type: String,
      default: "#EBEBEB",
    },

    //自己訊息色碼
    selfMsgColor: {
      type: String,
      default: "#A4B9EB",
    },

    //已讀標記色碼
    readTagColor: {
      type: String,
      default: "#A4B9EB",
    },

    //系統時間色碼
    systemTimeColor: {
      type: String,
      default: "#D1D1D1",
    },

    //傳送按鈕色碼
    sendBtnColor: {
      type: String,
      default: "#A4B9EB",
    },
  },
});

matchNewestSchema.index({ sendbirdUrl: 1, user1ID: 1, user2ID: 1 });

//隱藏 _id,__v
matchNewestSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    delete ret.user1ID, delete ret.user2ID;
    return ret;
  },
});

module.exports = mongoose.model("MatchNeswest", matchNewestSchema);
