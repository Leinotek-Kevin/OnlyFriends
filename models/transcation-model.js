const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作交易紀錄 Schema
const transcationSchema = new Schema({
  userID: {
    type: String,
    default: "",
  },

  platform: {
    type: String,
    enum: ["Android", "iOS"],
  },

  productID: {
    type: String,
    default: "",
  },

  transactionID: {
    type: String,
    unique: true,
  },

  originalTransactionID: {
    type: String,
    unique: true,
  },

  purchaseDate: {
    type: Number,
  },

  expiryDate: {
    type: Number,
  },

  amount: {
    type: Number,
  },

  currency: {
    type: String,
  },

  autoRenewing: {
    type: Boolean,
  },

  purchaseType: {
    type: String,
  },

  purchaseStatus: {
    type: Boolean,
  },

  latestReceipt: {
    type: String,
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
