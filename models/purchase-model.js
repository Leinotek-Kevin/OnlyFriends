const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作交易紀錄 Schema
const purchaseSchema = new Schema({
  //用戶 ID
  userID: {
    type: String,
    default: "",
  },

  //手機系統
  platform: {
    type: String,
    enum: ["Android", "iOS"],
  },

  //產品ID
  productID: {
    type: String,
    default: "",
  },

  //產品type subscription / in-app
  productType: {
    type: String,
  },

  //訂單ID
  orderID: {
    type: String,
    unique: true,
  },

  //開始日期
  startDate: {
    type: Number,
  },

  //截止日期
  expiryDate: {
    type: Number,
  },

  //價格
  price: {
    type: Number,
  },

  //幣別
  currency: {
    type: String,
  },

  //是否自動訂閱
  autoRenewing: {
    type: Boolean,
    default: false,
  },

  //續訂次數
  renewCount: {
    type: Number,
    default: 0,
  },

  //購買狀態類型
  purchaseType: {
    type: String,
  },

  //付款狀態
  paymentState: {
    type: Number,
  },

  //訂閱取消的原因（如果訂閱被取消）。常見的取消原因有：0: 用戶取消。 1: 付款問題（例如信用卡過期）
  cancelReason: {
    type: String,
  },

  //訂閱是否已被確認 0: 訂閱未被確認。 1: 訂閱已被確認
  acknowledgementState: {
    type: String,
    default: "0",
  },

  //退款類型
  refundType: {
    type: String,
  },

  //訂單狀態追蹤
  purchaseMemo: {
    type: String,
    default: "",
  },

  //是否允許訂閱
  isAllow: {
    type: Boolean,
    default: false,
  },

  //訂單建立時間
  createDate: {
    type: Number,
    default: Date.now(),
  },
});

purchaseSchema.index({ createDate: -1 }); // -1 for descending

//隱藏 _id,__v
purchaseSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Purchase", purchaseSchema);
