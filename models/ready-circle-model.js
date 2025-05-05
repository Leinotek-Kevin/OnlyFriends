const mongoose = require("mongoose");
const { Schema } = mongoose;

//製作預備圈圈 Schema
const readyCircleSchema = new Schema({
  //圈圈主題
  circleTopicID: {
    type: String,
    default: "",
  },

  //圈圈介紹
  circleIntro: {
    type: String,
    default: "",
  },

  //預備圈圈參加用戶:
  circleReadyUsers: {
    type: [{ type: String }],
    default: [],
  },

  // circleReadyUsers: {
  //   type: [
  //     {
  //       userID: { type: String, required: true },
  //       userRegion: { type: String, required: true },
  //       _id: false, // 加這行就不會出現 _id
  //     },
  //   ],
  //   default: [],
  // },
});

//隱藏 _id,__v
readyCircleSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("ReadyCircle", readyCircleSchema);
