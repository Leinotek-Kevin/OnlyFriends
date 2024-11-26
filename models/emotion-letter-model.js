const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作心情樹洞信封 Schema
const emotionLetterSchema = new Schema({
  //用戶 資料庫_id
  letterUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  letterUserID: {
    type: String,
    required: true,
  },

  //信封 ID
  letterID: {
    type: String,
    required: true,
  },

  //信封圖片
  letterPic: {
    type: String,
  },

  //信封內容
  letterContent: {
    type: String,
    maxlength: 50,
    required: true,
  },

  //信封撰寫時間
  createTime: {
    type: Number,
    required: true,
  },

  //案讚數量
  likeCount: {
    type: Number,
    default: 0,
  },

  //案讚狀態
  likeStatus: {
    type: Boolean,
    default: false,
  },
});

emotionLetterSchema.index({ createTime: -1, letterUserID: 1 });

//隱藏 _id,__v
emotionLetterSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    delete ret.letterUserID;
    return ret;
  },
});

module.exports = mongoose.model("EmotionLetter", emotionLetterSchema);
