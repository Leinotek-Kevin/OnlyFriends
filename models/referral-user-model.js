const mongoose = require("mongoose");
const { promotionCode } = require(".");
const { Schema } = mongoose;

//製作被推廣者用戶 Schema
const referalUserSchema = new Schema({
  //推廣者ID
  partherUserID: {
    type: String,
  },

  //用戶 ID
  referalUserID: {
    type: String,
  },

  //用戶暱稱
  referalUserName: {
    type: String,
    length: 16,
    required: true,
  },

  //用戶性別
  referalUserGender: {
    type: String,
    enum: ["0", "1", "2"], //0：女生 1：男生 2:特殊
    required: true,
  },

  //用戶年齡
  referalUserAge: {
    type: Number,
  },

  //用戶星座
  referalUserZodiac: {
    type: String,
    default: "",
  },

  //用戶所在地區
  referalUserRegion: {
    type: String,
    required: true,
  },

  //用戶系統設備
  referalosType: {
    type: String,
    enum: ["0", "1"], //0:Android / 1: iOS
  },

  //該用戶是否有訂閱
  isSubscription: {
    type: Boolean,
    default: false,
  },

  //試用訂閱截止時間
  freeSubExpiresDate: {
    type: String,
  },
});

//隱藏 _id,__v
referalUserSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("ReferalUserSchema", referalUserSchema);
