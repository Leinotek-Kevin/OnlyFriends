const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作會員 Schema
const userBufferSchema = new Schema({
  //用戶 ID
  userID: {
    type: String,
    required: true,
    unique: true,
  },

  //用戶性別
  userGender: {
    type: String,
    enum: ["0", "1", "2"], //0：女生 1：男生 2:特殊
    required: true,
  },

  //用戶年齡
  userAge: {
    type: String,
  },

  //用戶所在地區
  userRegion: {
    type: String,
    required: true,
  },

  //用戶屬性
  userAttribute: {
    //感情狀態
    emotion: {
      type: String,
      default: "",
    },
    //興趣愛好
    interested: {
      type: String,
      default: "",
    },
    //個人特質
    traits: {
      type: String,
      default: "",
    },
    //交友動機
    friendStatus: {
      type: String,
      default: "",
    },
    //情場經歷
    loveExperience: {
      type: String,
      default: "",
    },
  },

  //是否是機器人
  identity: {
    type: String,
    required: true,
    enum: ["0", "1", "2"], //0:假人 1:真人 2:官方指定
  },

  //該用戶是否有訂閱
  isSubscription: {
    type: Boolean,
    default: false,
  },
});

//隱藏 _id,__v
userBufferSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("UserBuffer", userBufferSchema);
