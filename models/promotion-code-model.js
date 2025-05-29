const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作促銷活動碼 Schema
const promotionCodeSchema = new Schema({
  //推廣碼
  promotionCode: {
    type: String,
    default: "",
  },

  //活動代理人 ID
  agentUserID: {
    type: String,
    default: "",
  },

  //推廣活動類型(100:免費試用)
  promotionType: {
    type: String,
    default: "",
  },

  //兌換開始日期
  promotionStart: {
    type: Number,
  },

  //兌換截止日期
  promotionExpired: {
    type: Number,
  },
});

promotionCodeSchema.index({ promotionType: 1 });

//隱藏 _id,__v
promotionCodeSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("PromotionCode", promotionCodeSchema);
