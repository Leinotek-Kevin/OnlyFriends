const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作聯盟行銷夥伴關係 Schema
const promoterUserSchema = new Schema({
  //用戶 ID
  promoterID: {
    type: String,
  },

  //聯盟推廣碼
  promotionCode: {
    type: String,
  },

  //推廣的用戶們
  referralUsers: [
    {
      userID: {
        type: String,
      },
    },
  ],
});

//隱藏 _id,__v
promoterUserSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("PromoterUser", promoterUserSchema);
