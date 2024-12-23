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
  platform: {
    type: String,
    enum: ["Android", "iOS"],
  },

  //產品ID
  productID: {
    type: String,
    default: "",
  },

  //產品type
  productType: {
    type: String,
    enum: ["0", "1"],
  },

  //訂單ID
  oderID: {
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

  //原子價格
  priceAmount: {
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

  //購買狀態類型 0: 已購買（成功購買）1: 已取消（表示用戶退款或取消）2: 待處理（交易尚未完成)
  purchaseType: {
    type: String,
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

  //訂單狀態追蹤
  purchaseMemo: {
    type: String,
    default: "",
  },

  //訂單原始驗證結果
  purchaseOriRecord: {
    type: String,
    default: "",
  },
});

//隱藏 _id,__v
transcationSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Transcation", transcationSchema);
