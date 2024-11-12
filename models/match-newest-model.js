const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作本日配對模組 Schema
const matchNewestSchema = new Schema({
  //用戶1 ID
  user1ID: {
    type: String,
    required: true,
  },

  //用戶2 ID
  user2ID: {
    type: String,
    required: true,
  },

  //用戶1 資料庫_id
  user1_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  //用戶2 資料庫_id
  user2_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  //SendBird
  sendbird: {
    url: {
      type: String,
      default: "",
    },
    isChecked: {
      type: Boolean,
      default: false,
    },
  },
});

matchNewestSchema.index({ user1ID: 1, user2ID: 1 });
matchNewestSchema.index({
  "sendbird.url": 1,
});

//隱藏 _id,__v
matchNewestSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    delete ret.user1ID, delete ret.user2ID;
    return ret;
  },
});

module.exports = mongoose.model("MatchNeswest", matchNewestSchema);
