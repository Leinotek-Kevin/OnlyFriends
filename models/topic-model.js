const mongoose = require("mongoose");
const { topic } = require(".");
const { Schema } = mongoose;

//製作背景主題 Schema
const topicSchema = new Schema({
  //背景主題ID
  topicID: {
    type: String,
  },

  //背景主題方案 F:免費 P:付費
  topicPlan: {
    type: String,
    enum: ["P", "F"],
  },

  //背景預覽圖
  topicPreview: {
    type: String,
  },

  //背景縮略圖
  topicThumbnail: {
    type: String,
  },

  //主題主色系 #FFFFFF
  topicPrimaryColor: {
    type: String,
  },

  //主題副色系 #FFFFFF
  topicSecondaryColor: {
    type: String,
  },

  //背景主題優先序
  priority: {
    type: Number,
  },
});

topicSchema.index({ priority: -1 });

//隱藏 _id,__v
topicSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Topic", topicSchema);
