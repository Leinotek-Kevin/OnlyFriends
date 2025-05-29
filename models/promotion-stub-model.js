const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作促銷活動票根 Schema
const promotionStubSchema = new Schema({
  //活動代理人 ID
  agentUserID: {
    type: String,
    required: true,
  },

  //兌換人 ID
  userID: {
    type: String,
    required: true,
  },

  //兌換活動類型(100:免費試用兩週)
  promotionType: {
    type: String,
    default: "",
  },

  //兌換日期
  redemptionDate: {
    type: Date,
    default: Date.now(),
  },

  //促銷截止日期(ex: promotionType=100 , 截止日就是兌換再加 14 天)
  expiredDate: {
    type: Number,
  },

  //票券狀態(-1:"已過期" , 0:"尚未生效" , 1:"活躍中")
  ticketStubStatus: {
    type: String,
    default: "0",
  },
});

//為了加速搜尋 活躍但已過期的票根
promotionStubSchema.index({ ticketStubStatus: 1, expiredDate: 1 });

//隱藏 _id,__v
promotionStubSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("PromotionStub", promotionStubSchema);
