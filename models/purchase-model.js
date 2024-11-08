const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作購買交易 Schema
const purchaseSchema = new Schema({
  //用戶1 ID
  userID: {
    type: String,
    required: true,
    unique: true,
  },

  osType: {
    type: String,
  },

  purchaseType: {
    type: String,
    enum: ["0", "1"], //0：訂閱 1:單購
    required: true,
    unique: true,
  },

  purchaseToken: {
    type: String,
    required: true,
    unique: true,
  },

  purchaseReceipt: {
    type: String,
  },

  purchaseDate: {
    type: Date,
    default: Date.now,
  },
});

purchaseSchema.index({ userID: 1, purchaseType: 1 }, { unique: true });

//隱藏 _id,__v
purchaseSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Purchase", purchaseSchema);
