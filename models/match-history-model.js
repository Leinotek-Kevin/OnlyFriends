const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作配對歷史 Schema
const matchHistorySchema = new Schema({
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

  matchDate: {
    type: Date,
    default: Date.now,
  },
});

//隱藏 _id,__v
matchHistorySchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    delete ret.user1ID, delete ret.user2ID;
    return ret;
  },
});

module.exports = mongoose.model("MatchHistory", matchHistorySchema);
