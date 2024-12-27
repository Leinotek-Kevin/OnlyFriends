const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作交易紀錄 Schema
const transcationSchema = new Schema({
  //用戶 ID
  userID: {
    type: String,
    default: "",
  },

  //手機系統
  platform: { type: String, enum: ["iOS", "Android"] }, // 用於區分平台

  // iOS 訂單ID 或 Android orderId
  transactionID: {
    type: String,
    default: "",
  },

  // iOS 初始訂單ID
  originalTransactionID: {
    type: String,
    default: "",
  },

  //產品ID
  productID: {
    type: String,
    default: "",
  },

  //產品type 0 subscription / 1 in-app
  productType: {
    type: String,
    enum: ["0", "1"],
  },

  //到期時間
  expiresDate: {
    type: Number,
  },

  //是否自動續訂
  autoRenewStatus: {
    type: Boolean,
  },

  //價格
  price: {
    type: Number,
  },

  //幣別
  currency: {
    type: String,
  },

  //訂單狀態
  status: {
    type: String,
  },

  //訂單是否允許存取
  isAllow: {
    type: Boolean,
    default: false,
  },

  //交易通知備註
  transcationMemo: {
    type: String,
  },

  //訂單購買時間
  purchaseDate: {
    type: String,
  },
});

transcationSchema.index({ expiresDate: -1 }); // -1 for descending

//隱藏 _id,__v
transcationSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Transcation", transcationSchema);
