const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作促銷推廣活動 Schema
const promotionActivitySchema = new Schema({
  //活動 ID
  activityID: {
    type: String,
  },

  //活動起始時間 unix
  activityStartTime: {
    type: Number,
  },

  //活動截止時間 unix
  activityEndTime: {
    type: Number,
  },

  //推廣者
  promoters: [
    {
      promoterID: {
        type: String,
      },
      promotionCode: {
        type: String,
      },
    },
  ],
});

//隱藏 _id,__v
promotionActivitySchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("PromotionActivity", promotionActivitySchema);
